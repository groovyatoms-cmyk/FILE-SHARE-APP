import { getIceServers } from "./iceServers";

export type PeerRole = "sender" | "receiver";

export type WebRtcConnectionState =
  | "new"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed"
  | "closed";

/**
 * Owns a single RTCPeerConnection and its two data channels (control +
 * file). All WebRTC wiring lives here so React components never touch
 * RTCPeerConnection directly. The control channel carries small JSON
 * protocol messages; the file channel carries binary chunk payloads.
 */
export class PeerConnectionManager {
  private pc: RTCPeerConnection;
  private controlChannel: RTCDataChannel | null = null;
  private fileChannel: RTCDataChannel | null = null;
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;

  private iceCandidateHandlers = new Set<(candidate: RTCIceCandidate) => void>();
  private connectionStateHandlers = new Set<(state: WebRtcConnectionState) => void>();
  private controlMessageHandlers = new Set<(data: string) => void>();
  private fileMessageHandlers = new Set<(data: string | ArrayBuffer) => void>();
  private channelsReadyHandlers = new Set<() => void>();

  constructor(private readonly role: PeerRole) {
    this.pc = new RTCPeerConnection({ iceServers: getIceServers() });
    this.wireConnectionEvents();

    if (role === "sender") {
      this.createLocalDataChannels();
    } else {
      this.pc.addEventListener("datachannel", (event) => this.attachChannel(event.channel));
    }
  }

  private wireConnectionEvents(): void {
    this.pc.addEventListener("icecandidate", (event) => {
      if (event.candidate) this.iceCandidateHandlers.forEach((h) => h(event.candidate!));
    });

    this.pc.addEventListener("connectionstatechange", () => {
      const mapped = this.mapState(this.pc.connectionState);
      this.connectionStateHandlers.forEach((h) => h(mapped));
    });
  }

  private mapState(state: RTCPeerConnectionState): WebRtcConnectionState {
    switch (state) {
      case "new":
        return "new";
      case "connecting":
        return "connecting";
      case "connected":
        return "connected";
      case "disconnected":
        return "disconnected";
      case "failed":
        return "failed";
      case "closed":
        return "closed";
      default:
        return "new";
    }
  }

  private createLocalDataChannels(): void {
    // Both channels stay ordered + reliable: correctness/integrity outrank
    // theoretical latency savings from unordered/unreliable delivery.
    const control = this.pc.createDataChannel("control", { ordered: true });
    const file = this.pc.createDataChannel("file-transfer", { ordered: true });
    file.binaryType = "arraybuffer";
    this.attachChannel(control);
    this.attachChannel(file);
  }

  private attachChannel(channel: RTCDataChannel): void {
    if (channel.label === "control") {
      this.controlChannel = channel;
      channel.addEventListener("message", (event) => {
        this.controlMessageHandlers.forEach((h) => h(event.data));
      });
    } else if (channel.label === "file-transfer") {
      channel.binaryType = "arraybuffer";
      this.fileChannel = channel;
      channel.addEventListener("message", (event) => {
        this.fileMessageHandlers.forEach((h) => h(event.data));
      });
    }
    channel.addEventListener("open", () => {
      if (this.controlChannel?.readyState === "open" && this.fileChannel?.readyState === "open") {
        this.channelsReadyHandlers.forEach((h) => h());
      }
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(desc);
    this.remoteDescriptionSet = true;
    for (const candidate of this.pendingRemoteCandidates) {
      await this.pc.addIceCandidate(candidate);
    }
    this.pendingRemoteCandidates = [];
  }

  async addRemoteIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.remoteDescriptionSet) {
      this.pendingRemoteCandidates.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate);
  }

  sendControl(data: string): void {
    if (this.controlChannel?.readyState === "open") this.controlChannel.send(data);
  }

  /**
   * Sends a small JSON text frame on the FILE channel (not the control
   * channel). Chunk metadata must travel on the same ordered channel as the
   * binary payload it describes — two separate data channels give no
   * ordering guarantee relative to each other, so splitting them across
   * channels can pair a chunk's metadata with the wrong binary frame.
   */
  sendFileChannelText(data: string): void {
    if (this.fileChannel?.readyState === "open") this.fileChannel.send(data);
  }

  sendFileChunk(data: ArrayBuffer): void {
    if (this.fileChannel?.readyState === "open") this.fileChannel.send(data);
  }

  get fileChannelBufferedAmount(): number {
    return this.fileChannel?.bufferedAmount ?? 0;
  }

  setBufferedAmountLowThreshold(threshold: number): void {
    if (this.fileChannel) this.fileChannel.bufferedAmountLowThreshold = threshold;
  }

  onFileChannelBufferedAmountLow(handler: () => void): () => void {
    const listener = () => handler();
    this.fileChannel?.addEventListener("bufferedamountlow", listener);
    return () => this.fileChannel?.removeEventListener("bufferedamountlow", listener);
  }

  onIceCandidate(handler: (candidate: RTCIceCandidate) => void): () => void {
    this.iceCandidateHandlers.add(handler);
    return () => this.iceCandidateHandlers.delete(handler);
  }

  onConnectionStateChange(handler: (state: WebRtcConnectionState) => void): () => void {
    this.connectionStateHandlers.add(handler);
    return () => this.connectionStateHandlers.delete(handler);
  }

  onControlMessage(handler: (data: string) => void): () => void {
    this.controlMessageHandlers.add(handler);
    return () => this.controlMessageHandlers.delete(handler);
  }

  onFileMessage(handler: (data: string | ArrayBuffer) => void): () => void {
    this.fileMessageHandlers.add(handler);
    return () => this.fileMessageHandlers.delete(handler);
  }

  onChannelsReady(handler: () => void): () => void {
    this.channelsReadyHandlers.add(handler);
    return () => this.channelsReadyHandlers.delete(handler);
  }

  get connectionState(): WebRtcConnectionState {
    return this.mapState(this.pc.connectionState);
  }

  close(): void {
    this.controlChannel?.close();
    this.fileChannel?.close();
    this.pc.close();
    this.iceCandidateHandlers.clear();
    this.connectionStateHandlers.clear();
    this.controlMessageHandlers.clear();
    this.fileMessageHandlers.clear();
    this.channelsReadyHandlers.clear();
  }
}
