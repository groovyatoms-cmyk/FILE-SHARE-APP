import {
  fileOfferSchema,
  sanitizeFileName,
  type ChunkMetaMessage,
  type FileCompleteMessage,
  type FileMetadata,
  type FileOfferMessage,
  type SessionInitMessage,
} from "@p2p/shared";
import { SignalingClient } from "../signaling/SignalingClient";
import { PeerConnectionManager } from "../webrtc/PeerConnectionManager";
import { ChunkReceiver, checksumsMatch } from "./chunkReceiver";
import { buildMessage, parseControlMessage } from "./controlProtocol";
import { FileSystemChunkSink, IndexedDbChunkSink, supportsFileSystemAccess } from "../storage/fileWriter";
import { importKeyRaw, type EncryptionSession } from "../crypto/encryption";
import { base64ToArrayBuffer } from "../../utils/base64";
import { useConnectionStore } from "../../stores/useConnectionStore";
import { useTransferStore } from "../../stores/useTransferStore";
import { useHistoryStore } from "../../stores/useHistoryStore";
import { RollingSpeedTracker } from "../../utils/rollingAverage";
import { saveAs } from "file-saver";

export interface JoinParams {
  sessionId?: string;
  token?: string;
  pairingCode?: string;
}

export interface IncomingOffer {
  transferId: string;
  senderName: string;
  files: FileMetadata[];
  totalSize: number;
  respond: (accept: boolean) => void;
}

type IncomingOfferHandler = (offer: IncomingOffer) => void;

export class ReceiverSession {
  private signaling: SignalingClient;
  private peer: PeerConnectionManager | null = null;
  private sessionId: string | null = null;
  private senderName = "Unknown device";
  private encryption: EncryptionSession | null = null;
  private receivers = new Map<string, ChunkReceiver>();
  private completedFileIds = new Set<string>();
  private fileChannelQueue: Promise<void> = Promise.resolve();
  private trackers = new Map<string, RollingSpeedTracker>();
  private metadataById = new Map<string, FileMetadata>();
  private pendingChunkMeta: ChunkMetaMessage | null = null;
  private saveDirHandle: FileSystemDirectoryHandle | null = null;
  private overallTracker = new RollingSpeedTracker();
  private offerHandlers = new Set<IncomingOfferHandler>();
  private cancelled = false;

  private handlersWired = false;
  private joinRequested = false;

  constructor(signalingUrl: string, private readonly displayName: string) {
    this.signaling = new SignalingClient(signalingUrl);
  }

  onIncomingOffer(handler: IncomingOfferHandler): () => void {
    this.offerHandlers.add(handler);
    return () => this.offerHandlers.delete(handler);
  }

  async join(params: JoinParams): Promise<void> {
    // Defensive: a duplicate join() call (double form submit, a re-fired
    // handler) must never wire a second set of signaling/WebRTC listeners —
    // that would create two independent PeerConnectionManager/ChunkReceiver
    // pipelines racing each other over the same transfer.
    if (this.joinRequested) return;
    this.joinRequested = true;

    useTransferStore.getState().reset();
    useTransferStore.getState().setDirection("receive");
    useConnectionStore.getState().setConnectionState("CREATING_SESSION");

    this.wireSignalingHandlers();
    await this.signaling.connect();

    this.signaling.send({
      type: "JOIN_SESSION",
      payload: {
        sessionId: params.sessionId,
        token: params.token,
        pairingCode: params.pairingCode,
        displayName: this.displayName,
      },
    });
  }

  /** Optionally called right after a user gesture (the Accept click) to enable direct-to-disk writes. */
  async requestSaveDirectory(): Promise<void> {
    if (!supportsFileSystemAccess()) return;
    try {
      const picker = (window as unknown as { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
        .showDirectoryPicker;
      if (picker) this.saveDirHandle = await picker();
    } catch {
      this.saveDirHandle = null; // user cancelled the picker — fall back to IndexedDB + download
    }
  }

  private wireSignalingHandlers(): void {
    if (this.handlersWired) return;
    this.handlersWired = true;

    this.signaling.on("SESSION_JOINED", (env) => {
      const payload = env.payload as { peerDisplayName: string };
      this.sessionId = env.sessionId ?? null;
      this.senderName = payload.peerDisplayName;
      useConnectionStore.getState().setPeer(payload.peerDisplayName);
      useConnectionStore.getState().setConnectionState("CONNECTING");
      useTransferStore.getState().setTransferState("CONNECTING");
      useTransferStore.getState().setPeerDisplayName(payload.peerDisplayName);
    });

    this.signaling.on("SESSION_NOT_FOUND", () => {
      useConnectionStore.getState().setError("Session not found or expired");
      useConnectionStore.getState().setConnectionState("FAILED");
    });

    this.signaling.on("SESSION_EXPIRED", () => {
      useConnectionStore.getState().setConnectionState("EXPIRED");
      useTransferStore.getState().setTransferState("EXPIRED");
    });

    this.signaling.on("OFFER", async (env) => {
      const payload = env.payload as { sdp: RTCSessionDescriptionInit };
      this.peer = new PeerConnectionManager("receiver");
      this.wirePeerHandlers(this.peer);
      const answer = await this.peer.createAnswer(payload.sdp);
      this.signaling.send({ type: "ANSWER", sessionId: this.sessionId!, payload: { sdp: answer } });
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

    this.signaling.on("ERROR", (env) => {
      const payload = env.payload as { message: string };
      useConnectionStore.getState().setError(payload.message);
    });
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
        useTransferStore.getState().setTransferState("INTERRUPTED");
        useConnectionStore.getState().setConnectionState("RECONNECTING");
      }
    });

    peer.onChannelsReady(() => {
      useConnectionStore.getState().setConnectionState("CONNECTED");
    });

    peer.onControlMessage((raw) => void this.handleControlMessage(raw));
    // File-channel messages must be processed strictly one at a time, fully
    // to completion, in arrival order. The channel itself guarantees
    // in-order *delivery*, but each message's handling here is async (chunk
    // decryption, a disk/IndexedDB write) — firing handlers without waiting
    // lets a later message (e.g. FILE_COMPLETE) finish processing, and
    // finalize the hash, while an earlier chunk's write is still pending,
    // corrupting the running digest. Chaining onto one queue preserves the
    // channel's ordering all the way through our own processing.
    peer.onFileMessage((data) => {
      this.fileChannelQueue = this.fileChannelQueue
        .then(() => this.handleFileChannelData(data))
        .catch((err) => console.error("Error processing file channel message", err));
    });
  }

  private async handleControlMessage(raw: string): Promise<void> {
    const msg = parseControlMessage(raw);
    if (!msg) return;

    switch (msg.type) {
      case "SESSION_INIT":
        await this.handleSessionInit(msg as SessionInitMessage);
        break;
      case "FILE_OFFER":
        await this.handleFileOffer(msg as FileOfferMessage);
        break;
      case "FILE_COMPLETE":
        await this.handleFileComplete(msg as FileCompleteMessage);
        break;
      case "TRANSFER_COMPLETE":
        useTransferStore.getState().setTransferState("COMPLETED");
        useConnectionStore.getState().setConnectionState("COMPLETED");
        break;
      case "PING":
        this.peer?.sendControl(JSON.stringify(buildMessage({ type: "PONG" })));
        break;
      case "CANCEL":
        useTransferStore.getState().setTransferState("CANCELLED");
        break;
      default:
        break;
    }
  }

  private async handleSessionInit(msg: SessionInitMessage): Promise<void> {
    if (msg.encryptionEnabled && msg.encryptionKey && msg.encryptionIvSalt) {
      const key = await importKeyRaw(base64ToArrayBuffer(msg.encryptionKey));
      const ivSalt = new Uint8Array(base64ToArrayBuffer(msg.encryptionIvSalt));
      this.encryption = { key, ivSalt };
    }
  }

  private async handleFileOffer(msg: FileOfferMessage): Promise<void> {
    // Never trust peer-provided metadata: validate shape, then sanitize names defensively.
    const validated = fileOfferSchema.safeParse(msg);
    if (!validated.success) return;

    const files = validated.data.files.map((f) => ({ ...f, name: sanitizeFileName(f.name) }));
    files.forEach((f) => this.metadataById.set(f.id, f));

    // A re-offer for files we already have live ChunkReceivers for (post-reconnect) skips the approval dialog.
    const newFiles = files.filter((f) => !this.receivers.has(f.id));
    if (newFiles.length === 0) {
      this.sendAccept(validated.data.transferId, files);
      return;
    }

    useTransferStore.getState().initFiles(files.map((f) => ({ id: f.id, name: f.name, size: f.size, type: f.type })));

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const offer: IncomingOffer = {
      transferId: validated.data.transferId,
      senderName: this.senderName,
      files,
      totalSize,
      respond: (accept: boolean) => void this.respondToOffer(validated.data.transferId, files, accept),
    };
    this.offerHandlers.forEach((h) => h(offer));
  }

  private async respondToOffer(transferId: string, files: FileMetadata[], accept: boolean): Promise<void> {
    if (!accept) {
      this.peer?.sendControl(JSON.stringify(buildMessage({ type: "FILE_REJECT", transferId })));
      useTransferStore.getState().setTransferState("CANCELLED");
      return;
    }

    await this.requestSaveDirectory();

    for (const meta of files) {
      const sink = await this.createSinkFor(meta);
      this.receivers.set(
        meta.id,
        new ChunkReceiver(meta, sink, {
          encryption: this.encryption,
          onProgress: (bytes) => this.onChunkProgress(meta.id, bytes),
        }),
      );
      this.trackers.set(meta.id, new RollingSpeedTracker());
    }

    this.sendAccept(transferId, files);
  }

  private sendAccept(transferId: string, files: FileMetadata[]): void {
    const resumeFrom: Record<string, number> = {};
    for (const meta of files) {
      const receiver = this.receivers.get(meta.id);
      if (receiver) resumeFrom[meta.id] = receiver.resumeFromChunk;
    }
    useTransferStore.getState().setTransferState("TRANSFERRING");
    this.peer?.sendControl(JSON.stringify(buildMessage({ type: "FILE_ACCEPT", transferId, resumeFrom })));
  }

  private async createSinkFor(meta: FileMetadata) {
    if (this.saveDirHandle) {
      try {
        const fileHandle = await this.saveDirHandle.getFileHandle(meta.name, { create: true });
        const writable = await fileHandle.createWritable();
        return new FileSystemChunkSink(writable);
      } catch {
        // Fall through to the IndexedDB sink if disk write setup fails (e.g. permission revoked).
      }
    }
    return new IndexedDbChunkSink(meta.id, meta.type);
  }

  private onChunkProgress(fileId: string, bytes: number): void {
    const tracker = this.trackers.get(fileId);
    tracker?.record(bytes);
    this.overallTracker.record(bytes);

    const current = useTransferStore.getState().files[fileId];
    const bytesTransferred = (current?.bytesTransferred ?? 0) + bytes;
    const size = this.metadataById.get(fileId)?.size ?? 0;
    useTransferStore.getState().updateFileProgress(fileId, {
      bytesTransferred,
      currentSpeedBps: tracker?.currentSpeedBps ?? 0,
      averageSpeedBps: tracker?.averageSpeedBps ?? 0,
      etaSeconds: tracker?.etaSeconds(size - bytesTransferred) ?? Infinity,
    });
    if (current?.status !== "TRANSFERRING") {
      useTransferStore.getState().setFileStatus(fileId, "TRANSFERRING");
    }
  }

  private async handleFileChannelData(data: string | ArrayBuffer): Promise<void> {
    if (typeof data === "string") {
      // Chunk metadata, FILE_COMPLETE and TRANSFER_COMPLETE all travel on
      // this same ordered file channel (never the control channel) so they
      // can never race ahead of, or fall behind, the chunk data they
      // describe or depend on — two separate data channels give no
      // ordering guarantee relative to each other.
      const msg = parseControlMessage(data);
      if (msg?.type === "CHUNK_META") {
        this.pendingChunkMeta = msg as ChunkMetaMessage;
      } else {
        await this.handleControlMessage(data);
      }
      return;
    }

    const meta = this.pendingChunkMeta;
    if (!meta) return;
    this.pendingChunkMeta = null;
    const receiver = this.receivers.get(meta.fileId);
    if (!receiver) return;
    await receiver.handleChunk(meta.chunkIndex, meta.iv, data);
  }

  private async handleFileComplete(msg: FileCompleteMessage): Promise<void> {
    const receiver = this.receivers.get(msg.fileId);
    const meta = this.metadataById.get(msg.fileId);
    if (!receiver || !meta || this.completedFileIds.has(msg.fileId)) return;
    this.completedFileIds.add(msg.fileId);

    useTransferStore.getState().setFileStatus(msg.fileId, "VERIFYING");
    const localDigest = receiver.digestHex();
    const verified = checksumsMatch(localDigest, msg.checksum);
    const blob = await receiver.finalize();

    if (blob) {
      saveAs(blob, meta.name);
    }

    useTransferStore.getState().setFileStatus(msg.fileId, verified ? "COMPLETED" : "FAILED", {
      checksumVerified: verified,
      error: verified ? undefined : "Integrity verification failed",
    });

    await useHistoryStore.getState().add({
      id: meta.id,
      direction: "received",
      fileName: meta.name,
      size: meta.size,
      timestamp: Date.now(),
      status: verified ? "completed" : "failed",
      peerName: this.senderName,
      verified,
    });
  }

  cancel(): void {
    this.cancelled = true;
    this.peer?.sendControl(JSON.stringify(buildMessage({ type: "CANCEL" })));
    useTransferStore.getState().setTransferState("CANCELLED");
    this.destroy();
  }

  destroy(): void {
    this.peer?.close();
    this.signaling.close();
  }
}
