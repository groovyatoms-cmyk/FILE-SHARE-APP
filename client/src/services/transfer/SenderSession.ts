import {
  DEFAULT_CHUNK_SIZE,
  sanitizeFileName,
  type FileAcceptMessage,
  type FileMetadata,
  type FileOfferMessage,
  type FileRejectMessage,
} from "@p2p/shared";
import { SignalingClient } from "../signaling/SignalingClient";
import { PeerConnectionManager } from "../webrtc/PeerConnectionManager";
import { ChunkPump } from "./chunkPump";
import { selectChunkSize } from "./chunkSize";
import { buildMessage, parseControlMessage } from "./controlProtocol";
import { generateEncryptionSession, exportKeyRaw, type EncryptionSession } from "../crypto/encryption";
import { arrayBufferToBase64 } from "../../utils/base64";
import { useConnectionStore } from "../../stores/useConnectionStore";
import { useTransferStore } from "../../stores/useTransferStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { RollingSpeedTracker } from "../../utils/rollingAverage";
import type { QueuedFile } from "../../stores/useSessionStore";

const PING_INTERVAL_MS = 8000;
const PONG_TIMEOUT_MS = 20000;
const RECONNECT_GRACE_MS = 3000;

export interface SenderSessionOptions {
  signalingUrl: string;
  displayName: string;
  timeoutSeconds: number;
  encryptionEnabled: boolean;
}

interface QueuedFileWithMeta extends QueuedFile {
  metadata: FileMetadata;
}

export class SenderSession {
  private signaling: SignalingClient;
  private peer: PeerConnectionManager | null = null;
  private sessionId: string | null = null;
  private queue: QueuedFileWithMeta[] = [];
  private activePump: ChunkPump | null = null;
  private activeFileIndex = 0;
  private encryption: EncryptionSession | null = null;
  private transferId = crypto.randomUUID();
  private speedTracker = new RollingSpeedTracker();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private cancelled = false;
  private reconnecting = false;

  constructor(private readonly opts: SenderSessionOptions) {
    this.signaling = new SignalingClient(opts.signalingUrl);
  }

  async start(files: QueuedFile[]): Promise<void> {
    useTransferStore.getState().reset();
    useTransferStore.getState().setDirection("send");
    useTransferStore.getState().setTransferState("PREPARING");

    this.queue = files.map((f) => ({
      ...f,
      metadata: {
        id: f.id,
        name: sanitizeFileName(f.file.name),
        size: f.file.size,
        type: f.file.type || "application/octet-stream",
        lastModified: f.file.lastModified,
        totalChunks: Math.ceil(f.file.size / selectChunkSize(f.file.size)) || 1,
        chunkSize: selectChunkSize(f.file.size),
        relativePath: f.relativePath,
      },
    }));

    useTransferStore.getState().initFiles(this.queue.map((q) => ({ id: q.id, name: q.file.name, size: q.file.size, type: q.file.type })));

    if (this.opts.encryptionEnabled) {
      this.encryption = await generateEncryptionSession();
    }

    this.wireSignalingHandlers();
    await this.signaling.connect();

    useTransferStore.getState().setTransferState("WAITING_FOR_PEER");
    useConnectionStore.getState().setConnectionState("CREATING_SESSION");
    this.signaling.send({
      type: "CREATE_SESSION",
      payload: { displayName: this.opts.displayName, timeoutSeconds: this.opts.timeoutSeconds },
    });
  }

  private wireSignalingHandlers(): void {
    this.signaling.on("SESSION_CREATED", (env) => {
      const payload = env.payload as { sessionId: string; token: string; pairingCode: string; expiresAt: number };
      this.sessionId = payload.sessionId;
      useConnectionStore.getState().setSession(payload.sessionId, payload.token, payload.pairingCode, payload.expiresAt);
      useConnectionStore.getState().setConnectionState("WAITING_FOR_RECEIVER");
    });

    this.signaling.on("PEER_JOINED", (env) => {
      const payload = env.payload as { peerDisplayName: string };
      useConnectionStore.getState().setPeer(payload.peerDisplayName);
      useConnectionStore.getState().setConnectionState("RECEIVER_CONNECTED");
      useTransferStore.getState().setPeerDisplayName(payload.peerDisplayName);
      void this.beginWebRtcHandshake();
    });

    this.signaling.on("ANSWER", async (env) => {
      const payload = env.payload as { sdp: RTCSessionDescriptionInit };
      await this.peer?.setRemoteDescription(payload.sdp);
    });

    this.signaling.on("ICE_CANDIDATE", async (env) => {
      const payload = env.payload as { candidate: RTCIceCandidateInit };
      await this.peer?.addRemoteIceCandidate(payload.candidate);
    });

    this.signaling.on("PEER_LEFT", () => {
      if (this.cancelled) return;
      useConnectionStore.getState().setConnectionState("RECONNECTING");
      useTransferStore.getState().setTransferState("INTERRUPTED");
    });

    this.signaling.on("SESSION_EXPIRED", () => {
      useConnectionStore.getState().setConnectionState("EXPIRED");
      useTransferStore.getState().setTransferState("EXPIRED");
    });

    this.signaling.on("ERROR", (env) => {
      const payload = env.payload as { message: string };
      useConnectionStore.getState().setError(payload.message);
    });
  }

  private async beginWebRtcHandshake(): Promise<void> {
    useConnectionStore.getState().setConnectionState("NEGOTIATING");
    useTransferStore.getState().setTransferState("CONNECTING");

    this.peer = new PeerConnectionManager("sender");
    this.wirePeerHandlers(this.peer);

    const offer = await this.peer.createOffer();
    this.signaling.send({ type: "OFFER", sessionId: this.sessionId!, payload: { sdp: offer } });
  }

  private wirePeerHandlers(peer: PeerConnectionManager): void {
    peer.onIceCandidate((candidate) => {
      this.signaling.send({
        type: "ICE_CANDIDATE",
        sessionId: this.sessionId!,
        payload: { candidate: candidate.toJSON() },
      });
    });

    peer.onConnectionStateChange((state) => {
      if (state === "connected") {
        useConnectionStore.getState().setConnectionState("CONNECTED");
      } else if ((state === "disconnected" || state === "failed") && !this.cancelled) {
        this.handleConnectionLoss();
      }
    });

    peer.onChannelsReady(() => {
      if (this.reconnecting) {
        this.reconnecting = false;
        useConnectionStore.getState().setConnectionState("CONNECTED");
        useTransferStore.getState().setTransferState("TRANSFERRING");
        this.resumeCurrentFileAfterReconnect();
      } else {
        void this.onInitialChannelsReady();
      }
    });

    peer.onControlMessage((raw) => this.handleControlMessage(raw));
    this.startHeartbeat(peer);
  }

  private async onInitialChannelsReady(): Promise<void> {
    useConnectionStore.getState().setConnectionState("CONNECTED");
    useTransferStore.getState().setTransferState("AWAITING_ACCEPTANCE");

    let encryptionKey: string | undefined;
    let encryptionIvSalt: string | undefined;
    if (this.encryption) {
      encryptionKey = arrayBufferToBase64(await exportKeyRaw(this.encryption.key));
      encryptionIvSalt = arrayBufferToBase64(this.encryption.ivSalt.buffer as ArrayBuffer);
    }

    this.peer!.sendControl(
      JSON.stringify(
        buildMessage({
          type: "SESSION_INIT",
          senderName: this.opts.displayName,
          encryptionEnabled: this.opts.encryptionEnabled,
          encryptionKey,
          encryptionIvSalt,
        }),
      ),
    );

    const offer: FileOfferMessage = buildMessage({
      type: "FILE_OFFER",
      transferId: this.transferId,
      files: this.queue.map((q) => q.metadata),
    });
    this.peer!.sendControl(JSON.stringify(offer));
  }

  private handleControlMessage(raw: string): void {
    const msg = parseControlMessage(raw);
    if (!msg) return;

    switch (msg.type) {
      case "FILE_ACCEPT":
        void this.handleAccept(msg as FileAcceptMessage);
        break;
      case "FILE_REJECT":
        this.handleReject(msg as FileRejectMessage);
        break;
      case "PONG":
        if (this.pongTimeout) clearTimeout(this.pongTimeout);
        break;
      case "CANCEL":
        this.cancelAll();
        break;
      case "PAUSE":
        this.activePump?.pause();
        if (msg.fileId) useTransferStore.getState().setFileStatus(msg.fileId, "PAUSED");
        break;
      case "RESUME":
        this.activePump?.resume();
        if (msg.fileId) useTransferStore.getState().setFileStatus(msg.fileId, "TRANSFERRING");
        break;
      default:
        break;
    }
  }

  private async handleAccept(msg: FileAcceptMessage): Promise<void> {
    useTransferStore.getState().setTransferState("TRANSFERRING");
    const resumeMap = msg.resumeFrom ?? {};
    for (let i = 0; i < this.queue.length; i++) {
      this.activeFileIndex = i;
      const item = this.queue[i]!;
      if (this.cancelled) return;
      const startChunk = resumeMap[item.metadata.id] ?? 0;
      await this.sendFile(item, i, startChunk);
    }
    if (!this.cancelled) {
      // Sent on the file channel, not control: it must arrive strictly after
      // every chunk of every file, and only the file channel guarantees that
      // ordering relative to the chunks themselves (see FILE_COMPLETE below).
      this.peer!.sendFileChannelText(
        JSON.stringify(buildMessage({ type: "TRANSFER_COMPLETE", transferId: this.transferId })),
      );
      useTransferStore.getState().setTransferState("COMPLETED");
      useConnectionStore.getState().setConnectionState("COMPLETED");
    }
  }

  private async sendFile(item: QueuedFileWithMeta, fileIndex: number, startChunk: number): Promise<void> {
    useTransferStore.getState().setFileStatus(item.id, "TRANSFERRING");
    const tracker = new RollingSpeedTracker();

    const pump = new ChunkPump(
      item.file,
      fileIndex,
      item.metadata.chunkSize,
      item.metadata.totalChunks,
      {
        sendMeta: (chunkIndex, byteLength, iv) => {
          this.peer!.sendFileChannelText(
            JSON.stringify(
              buildMessage({ type: "CHUNK_META", fileId: item.metadata.id, chunkIndex, byteLength, iv }),
            ),
          );
        },
        sendBinary: (data) => this.peer!.sendFileChunk(data),
        getBufferedAmount: () => this.peer!.fileChannelBufferedAmount,
        setBufferedAmountLowThreshold: (bytes) => this.peer!.setBufferedAmountLowThreshold(bytes),
        onBufferedAmountLow: (handler) => this.peer!.onFileChannelBufferedAmountLow(handler),
        onProgress: (bytes) => {
          tracker.record(bytes);
          this.speedTracker.record(bytes);
          const current = useTransferStore.getState().files[item.id];
          const bytesTransferred = (current?.bytesTransferred ?? 0) + bytes;
          useTransferStore.getState().updateFileProgress(item.id, {
            bytesTransferred,
            currentSpeedBps: tracker.currentSpeedBps,
            averageSpeedBps: tracker.averageSpeedBps,
            etaSeconds: tracker.etaSeconds(item.metadata.size - bytesTransferred),
          });
          useTransferStore
            .getState()
            .setOverallSpeed(this.speedTracker.currentSpeedBps, this.speedTracker.etaSeconds(this.remainingBytes()));
        },
      },
      this.encryption,
    );

    this.activePump = pump;
    const outcome = await pump.run(startChunk);
    this.activePump = null;

    if (outcome.status === "cancelled") {
      useTransferStore.getState().setFileStatus(item.id, "CANCELLED");
      return;
    }

    // Sent on the file channel: a control-channel message has no ordering
    // guarantee relative to data still in flight on a different channel, so
    // sending FILE_COMPLETE on control could let it race ahead of this
    // file's last chunks and reach the receiver before they do.
    this.peer!.sendFileChannelText(
      JSON.stringify(buildMessage({ type: "FILE_COMPLETE", fileId: item.metadata.id, checksum: outcome.checksum })),
    );
    useTransferStore.getState().setFileStatus(item.id, "COMPLETED", { checksumVerified: undefined });
    await useHistoryStore.getState().add({
      id: item.metadata.id,
      direction: "sent",
      fileName: item.metadata.name,
      size: item.metadata.size,
      timestamp: Date.now(),
      status: "completed",
      peerName: useConnectionStore.getState().peerDisplayName ?? "Unknown device",
      verified: true,
    });
  }

  private remainingBytes(): number {
    const state = useTransferStore.getState();
    return state.fileOrder.reduce((sum, id) => {
      const f = state.files[id];
      return f ? sum + (f.size - f.bytesTransferred) : sum;
    }, 0);
  }

  private handleReject(msg: FileRejectMessage): void {
    void msg;
    useTransferStore.getState().setTransferState("CANCELLED");
    useConnectionStore.getState().setConnectionState("CANCELLED");
  }

  private startHeartbeat(peer: PeerConnectionManager): void {
    this.pingTimer = setInterval(() => {
      peer.sendControl(JSON.stringify(buildMessage({ type: "PING" })));
      this.pongTimeout = setTimeout(() => {
        if (!this.cancelled) this.handleConnectionLoss();
      }, PONG_TIMEOUT_MS);
    }, PING_INTERVAL_MS);
  }

  private handleConnectionLoss(): void {
    const transferState = useTransferStore.getState().transferState;
    if (transferState === "COMPLETED" || transferState === "CANCELLED") return;
    useTransferStore.getState().setTransferState("INTERRUPTED");
    useConnectionStore.getState().setConnectionState("RECONNECTING");
    this.activePump?.pause();
    setTimeout(() => void this.attemptReconnect(), RECONNECT_GRACE_MS);
  }

  private async attemptReconnect(): Promise<void> {
    if (this.cancelled || !this.sessionId) return;
    if (this.signaling.connectionState !== "open") return; // signaling itself will keep retrying; we react to its 'open' via re-running this
    this.reconnecting = true;
    this.peer?.close();
    this.peer = new PeerConnectionManager("sender");
    this.wirePeerHandlers(this.peer);
    const offer = await this.peer.createOffer();
    this.signaling.send({ type: "OFFER", sessionId: this.sessionId, payload: { sdp: offer } });
  }

  private resumeCurrentFileAfterReconnect(): void {
    const item = this.queue[this.activeFileIndex];
    if (!item) return;
    // Ask the receiver where it left off by re-offering; its FILE_ACCEPT will carry resumeFrom.
    this.peer!.sendControl(
      JSON.stringify(
        buildMessage({
          type: "FILE_OFFER",
          transferId: this.transferId,
          files: [item.metadata],
        }),
      ),
    );
  }

  pauseCurrentFile(): void {
    this.activePump?.pause();
    const item = this.queue[this.activeFileIndex];
    if (item) {
      this.peer?.sendControl(JSON.stringify(buildMessage({ type: "PAUSE", fileId: item.metadata.id })));
      useTransferStore.getState().setFileStatus(item.id, "PAUSED");
      useTransferStore.getState().setTransferState("PAUSED");
    }
  }

  resumeCurrentFile(): void {
    this.activePump?.resume();
    const item = this.queue[this.activeFileIndex];
    if (item) {
      this.peer?.sendControl(JSON.stringify(buildMessage({ type: "RESUME", fileId: item.metadata.id })));
      useTransferStore.getState().setFileStatus(item.id, "TRANSFERRING");
      useTransferStore.getState().setTransferState("TRANSFERRING");
    }
  }

  cancelAll(reason?: string): void {
    this.cancelled = true;
    this.activePump?.cancel();
    this.peer?.sendControl(JSON.stringify(buildMessage({ type: "CANCEL", reason })));
    useTransferStore.getState().setTransferState("CANCELLED");
    useConnectionStore.getState().setConnectionState("CANCELLED");
    this.destroy();
  }

  destroy(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
    this.peer?.close();
    this.signaling.close();
  }
}
