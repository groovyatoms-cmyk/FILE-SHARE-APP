// ---------------------------------------------------------------------------
// Core enums / state machines
// ---------------------------------------------------------------------------

/** Explicit transfer state machine. Never infer state from loose booleans. */
export type TransferState =
  | "IDLE"
  | "PREPARING"
  | "WAITING_FOR_PEER"
  | "CONNECTING"
  | "AWAITING_ACCEPTANCE"
  | "TRANSFERRING"
  | "PAUSED"
  | "VERIFYING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED"
  | "INTERRUPTED";

export type ConnectionState =
  | "CREATING_SESSION"
  | "WAITING_FOR_RECEIVER"
  | "RECEIVER_CONNECTED"
  | "NEGOTIATING"
  | "CONNECTING"
  | "CONNECTED"
  | "TRANSFERRING"
  | "PAUSED"
  | "RECONNECTING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | "EXPIRED";

export type PerFileStatus =
  | "QUEUED"
  | "TRANSFERRING"
  | "PAUSED"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

// ---------------------------------------------------------------------------
// File metadata / protocol messages exchanged over the WebRTC data channel
// ---------------------------------------------------------------------------

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  totalChunks: number;
  chunkSize: number;
  /** Relative path within a selected folder, if any (sanitized, no leading slash). */
  relativePath?: string;
  /** SHA-256 hex digest, computed by the sender before/while sending. */
  checksum?: string;
}

export type DataChannelMessageType =
  | "SESSION_INIT"
  | "FILE_OFFER"
  | "FILE_ACCEPT"
  | "FILE_REJECT"
  | "CHUNK_META"
  | "CHUNK_ACK"
  | "PAUSE"
  | "RESUME"
  | "CANCEL"
  | "FILE_COMPLETE"
  | "TRANSFER_COMPLETE"
  | "RESUME_REQUEST"
  | "ERROR"
  | "PING"
  | "PONG";

export interface BaseControlMessage<T extends DataChannelMessageType = DataChannelMessageType> {
  type: T;
  ts: number;
}

export interface SessionInitMessage extends BaseControlMessage<"SESSION_INIT"> {
  senderName: string;
  encryptionEnabled: boolean;
  /** Base64-encoded raw AES-GCM key, present only when encryptionEnabled is true.
   *  Transmitted over the control channel, which itself rides WebRTC's DTLS transport. */
  encryptionKey?: string;
  encryptionIvSalt?: string;
}

export interface FileOfferMessage extends BaseControlMessage<"FILE_OFFER"> {
  files: FileMetadata[];
  transferId: string;
}

export interface FileAcceptMessage extends BaseControlMessage<"FILE_ACCEPT"> {
  transferId: string;
  /** Chunk indices already held per file, for resume. Empty means start fresh. */
  resumeFrom?: Record<string, number>;
}

export interface FileRejectMessage extends BaseControlMessage<"FILE_REJECT"> {
  transferId: string;
  reason?: string;
}

/** Sent immediately before the binary chunk payload on the file channel. */
export interface ChunkMetaMessage extends BaseControlMessage<"CHUNK_META"> {
  fileId: string;
  chunkIndex: number;
  byteLength: number;
  /** Present only when application-level encryption is enabled. */
  iv?: string;
}

export interface ChunkAckMessage extends BaseControlMessage<"CHUNK_ACK"> {
  fileId: string;
  chunkIndex: number;
}

export interface PauseMessage extends BaseControlMessage<"PAUSE"> {
  fileId?: string;
}

export interface ResumeMessage extends BaseControlMessage<"RESUME"> {
  fileId?: string;
}

export interface CancelMessage extends BaseControlMessage<"CANCEL"> {
  fileId?: string;
  reason?: string;
}

export interface FileCompleteMessage extends BaseControlMessage<"FILE_COMPLETE"> {
  fileId: string;
  checksum: string;
}

export interface TransferCompleteMessage extends BaseControlMessage<"TRANSFER_COMPLETE"> {
  transferId: string;
}

export interface ResumeRequestMessage extends BaseControlMessage<"RESUME_REQUEST"> {
  fileId: string;
  fromChunk: number;
}

export interface ErrorMessage extends BaseControlMessage<"ERROR"> {
  code: string;
  message: string;
}

export interface PingMessage extends BaseControlMessage<"PING"> {}
export interface PongMessage extends BaseControlMessage<"PONG"> {}

export type ControlMessage =
  | SessionInitMessage
  | FileOfferMessage
  | FileAcceptMessage
  | FileRejectMessage
  | ChunkMetaMessage
  | ChunkAckMessage
  | PauseMessage
  | ResumeMessage
  | CancelMessage
  | FileCompleteMessage
  | TransferCompleteMessage
  | ResumeRequestMessage
  | ErrorMessage
  | PingMessage
  | PongMessage;

// ---------------------------------------------------------------------------
// QR pairing payload (short-lived connection info only — never file data)
// ---------------------------------------------------------------------------

export interface QrPairingPayload {
  version: number;
  sessionId: string;
  token: string;
  signalingUrl: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Signaling protocol (client <-> signaling server, over WebSocket)
// ---------------------------------------------------------------------------

export type SignalingMessageType =
  | "CREATE_SESSION"
  | "SESSION_CREATED"
  | "JOIN_SESSION"
  | "SESSION_JOINED"
  | "PEER_JOINED"
  | "OFFER"
  | "ANSWER"
  | "ICE_CANDIDATE"
  | "PEER_LEFT"
  | "SESSION_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "RATE_LIMITED"
  | "ERROR";

export interface SignalingEnvelope<T = unknown> {
  type: SignalingMessageType;
  sessionId?: string;
  payload?: T;
}

export interface CreateSessionPayload {
  displayName: string;
  timeoutSeconds?: number;
}

export interface SessionCreatedPayload {
  sessionId: string;
  token: string;
  pairingCode: string;
  expiresAt: number;
}

export interface JoinSessionPayload {
  /** Provided together when joining via a scanned QR code. */
  sessionId?: string;
  token?: string;
  /** Provided alone when joining via a manually typed short pairing code. */
  pairingCode?: string;
  displayName: string;
}

export interface SdpPayload {
  sdp: RTCSessionDescriptionInitLike;
}

export interface IceCandidatePayload {
  candidate: RTCIceCandidateInitLike;
}

/** Avoids a hard dependency on DOM lib types inside the Node server build. */
export interface RTCSessionDescriptionInitLike {
  type: "offer" | "answer" | "pranswer" | "rollback";
  sdp?: string;
}

export interface RTCIceCandidateInitLike {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
