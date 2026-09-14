import type { IncomingMessage } from "node:http";
import type { RawData, WebSocket } from "ws";
import {
  createSessionPayloadSchema,
  iceCandidatePayloadSchema,
  joinSessionPayloadSchema,
  MAX_SIGNALING_MESSAGE_BYTES,
  sdpPayloadSchema,
  type SignalingEnvelope,
} from "@p2p/shared";
import { SessionManager } from "../sessions/sessionManager.js";
import { RateLimiter } from "../security/rateLimiter.js";
import { logger } from "../utils/logger.js";

interface RelayDeps {
  sessions: SessionManager;
  rateLimiter: RateLimiter;
}

function send(socket: WebSocket, envelope: SignalingEnvelope): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(envelope));
  }
}

function sendError(socket: WebSocket, code: string, message: string): void {
  send(socket, { type: "ERROR", payload: { code, message } });
}

function rawDataByteLength(raw: RawData): number {
  if (Array.isArray(raw)) return raw.reduce((sum, buf) => sum + buf.byteLength, 0);
  return raw.byteLength;
}

export function clientIpFor(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]!.trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

export class SignalingRelay {
  constructor(private readonly deps: RelayDeps) {}

  handleConnection(socket: WebSocket, req: IncomingMessage): void {
    const ip = clientIpFor(req);

    socket.on("message", (raw, isBinary) => {
      if (isBinary) {
        sendError(socket, "INVALID_MESSAGE", "Binary frames are not permitted on the signaling channel");
        return;
      }
      if (rawDataByteLength(raw) > MAX_SIGNALING_MESSAGE_BYTES) {
        sendError(socket, "MESSAGE_TOO_LARGE", "Signaling message exceeds the maximum allowed size");
        return;
      }
      if (!this.deps.rateLimiter.check(ip)) {
        send(socket, { type: "RATE_LIMITED", payload: { code: "RATE_LIMITED", message: "Too many messages" } });
        return;
      }

      let envelope: SignalingEnvelope;
      try {
        envelope = JSON.parse(raw.toString("utf8"));
      } catch {
        sendError(socket, "INVALID_JSON", "Message must be valid JSON");
        return;
      }

      try {
        this.route(socket, envelope);
      } catch (err) {
        logger.error("error handling signaling message", { errType: (err as Error).name });
        sendError(socket, "INTERNAL_ERROR", "Failed to process message");
      }
    });

    socket.on("close", () => this.handleDisconnect(socket));
  }

  private route(socket: WebSocket, envelope: SignalingEnvelope): void {
    switch (envelope.type) {
      case "CREATE_SESSION":
        return this.handleCreateSession(socket, envelope);
      case "JOIN_SESSION":
        return this.handleJoinSession(socket, envelope);
      case "OFFER":
      case "ANSWER":
        return this.handleSdpRelay(socket, envelope);
      case "ICE_CANDIDATE":
        return this.handleIceRelay(socket, envelope);
      default:
        sendError(socket, "UNKNOWN_TYPE", `Unsupported message type: ${envelope.type}`);
    }
  }

  private handleCreateSession(socket: WebSocket, envelope: SignalingEnvelope): void {
    const parsed = createSessionPayloadSchema.safeParse(envelope.payload);
    if (!parsed.success) {
      sendError(socket, "INVALID_PAYLOAD", "Invalid CREATE_SESSION payload");
      return;
    }
    const session = this.deps.sessions.createSession(
      socket,
      parsed.data.displayName,
      parsed.data.timeoutSeconds,
    );
    send(socket, {
      type: "SESSION_CREATED",
      sessionId: session.id,
      payload: {
        sessionId: session.id,
        token: session.token,
        pairingCode: session.pairingCode,
        expiresAt: session.expiresAt,
      },
    });
  }

  private handleJoinSession(socket: WebSocket, envelope: SignalingEnvelope): void {
    const parsed = joinSessionPayloadSchema.safeParse(envelope.payload);
    if (!parsed.success) {
      sendError(socket, "INVALID_PAYLOAD", "Invalid JOIN_SESSION payload");
      return;
    }
    const { sessionId, token, pairingCode, displayName } = parsed.data;

    const session = pairingCode
      ? this.deps.sessions.resolvePairingCode(pairingCode)
      : sessionId
        ? this.deps.sessions.getById(sessionId)
        : undefined;

    if (!session) {
      send(socket, { type: "SESSION_NOT_FOUND", payload: { code: "SESSION_NOT_FOUND", message: "Session not found or expired" } });
      return;
    }
    if (this.deps.sessions.isExpired(session)) {
      send(socket, { type: "SESSION_EXPIRED", sessionId: session.id });
      return;
    }
    if (sessionId && token && session.token !== token) {
      sendError(socket, "INVALID_TOKEN", "Invalid session token");
      return;
    }
    if (session.consumed) {
      sendError(socket, "SESSION_ALREADY_JOINED", "This session already has a receiver");
      return;
    }

    this.deps.sessions.joinAsReceiver(session, socket, displayName);

    send(socket, {
      type: "SESSION_JOINED",
      sessionId: session.id,
      payload: { peerDisplayName: session.sender?.displayName ?? "Unknown device" },
    });
    if (session.sender) {
      send(session.sender.socket, {
        type: "PEER_JOINED",
        sessionId: session.id,
        payload: { peerDisplayName: displayName },
      });
    }
  }

  private handleSdpRelay(socket: WebSocket, envelope: SignalingEnvelope): void {
    const parsed = sdpPayloadSchema.safeParse(envelope.payload);
    if (!parsed.success || !envelope.sessionId) {
      sendError(socket, "INVALID_PAYLOAD", `Invalid ${envelope.type} payload`);
      return;
    }
    const found = this.deps.sessions.findSessionBySocket(socket);
    if (!found || found.session.id !== envelope.sessionId) {
      sendError(socket, "NOT_IN_SESSION", "You are not part of this session");
      return;
    }
    const peer = found.role === "sender" ? found.session.receiver : found.session.sender;
    if (!peer) {
      sendError(socket, "PEER_NOT_CONNECTED", "The other peer is not connected");
      return;
    }
    send(peer.socket, { type: envelope.type, sessionId: envelope.sessionId, payload: parsed.data });
  }

  private handleIceRelay(socket: WebSocket, envelope: SignalingEnvelope): void {
    const parsed = iceCandidatePayloadSchema.safeParse(envelope.payload);
    if (!parsed.success || !envelope.sessionId) {
      sendError(socket, "INVALID_PAYLOAD", "Invalid ICE_CANDIDATE payload");
      return;
    }
    const found = this.deps.sessions.findSessionBySocket(socket);
    if (!found || found.session.id !== envelope.sessionId) {
      sendError(socket, "NOT_IN_SESSION", "You are not part of this session");
      return;
    }
    const peer = found.role === "sender" ? found.session.receiver : found.session.sender;
    if (!peer) return; // ICE candidates arriving before the peer joins are simply dropped
    send(peer.socket, { type: "ICE_CANDIDATE", sessionId: envelope.sessionId, payload: parsed.data });
  }

  private handleDisconnect(socket: WebSocket): void {
    const found = this.deps.sessions.findSessionBySocket(socket);
    if (!found) return;
    const { session, role } = found;
    const other = role === "sender" ? session.receiver : session.sender;
    if (other) {
      send(other.socket, { type: "PEER_LEFT", sessionId: session.id });
    }
    if (role === "sender") {
      session.sender = null;
      // Without a sender the session can no longer negotiate; tear it down.
      this.deps.sessions.destroy(session.id);
    } else {
      session.receiver = null;
      session.consumed = false;
    }
  }
}
