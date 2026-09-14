import type { WebSocket } from "ws";
import {
  DEFAULT_SESSION_TIMEOUT_SECONDS,
  PAIRING_CODE_LENGTH,
  SESSION_ID_LENGTH,
} from "@p2p/shared";
import { generatePairingCode, generateSessionId, generateToken } from "../utils/id.js";
import { logger } from "../utils/logger.js";

export interface PeerConnection {
  socket: WebSocket;
  displayName: string;
  joinedAt: number;
}

export interface Session {
  id: string;
  token: string;
  pairingCode: string;
  createdAt: number;
  expiresAt: number;
  /** Single-use: once a receiver has joined, the token/pairing code can't be reused by a third party. */
  consumed: boolean;
  sender: PeerConnection | null;
  receiver: PeerConnection | null;
}

/**
 * In-memory session store. Sessions are ephemeral and hold no file data —
 * only connection metadata needed to broker a WebRTC handshake.
 */
export class SessionManager {
  private readonly sessionsById = new Map<string, Session>();
  private readonly sessionIdByPairingCode = new Map<string, string>();

  createSession(
    sender: WebSocket,
    displayName: string,
    timeoutSeconds: number = DEFAULT_SESSION_TIMEOUT_SECONDS,
  ): Session {
    let id = generateSessionId(SESSION_ID_LENGTH);
    while (this.sessionsById.has(id)) {
      id = generateSessionId(SESSION_ID_LENGTH);
    }
    let pairingCode = generatePairingCode(PAIRING_CODE_LENGTH);
    while (this.sessionIdByPairingCode.has(pairingCode)) {
      pairingCode = generatePairingCode(PAIRING_CODE_LENGTH);
    }

    const now = Date.now();
    const session: Session = {
      id,
      token: generateToken(),
      pairingCode,
      createdAt: now,
      expiresAt: now + timeoutSeconds * 1000,
      consumed: false,
      sender: { socket: sender, displayName, joinedAt: now },
      receiver: null,
    };

    this.sessionsById.set(id, session);
    this.sessionIdByPairingCode.set(pairingCode, id);
    logger.info("session created", { sessionId: id });
    return session;
  }

  getById(id: string): Session | undefined {
    const session = this.sessionsById.get(id);
    if (session && this.isExpired(session)) {
      this.destroy(session.id);
      return undefined;
    }
    return session;
  }

  resolvePairingCode(pairingCode: string): Session | undefined {
    const id = this.sessionIdByPairingCode.get(pairingCode);
    if (!id) return undefined;
    return this.getById(id);
  }

  isExpired(session: Session): boolean {
    return Date.now() > session.expiresAt;
  }

  joinAsReceiver(session: Session, socket: WebSocket, displayName: string): void {
    session.receiver = { socket, displayName, joinedAt: Date.now() };
    session.consumed = true;
  }

  findSessionBySocket(socket: WebSocket): { session: Session; role: "sender" | "receiver" } | undefined {
    for (const session of this.sessionsById.values()) {
      if (session.sender?.socket === socket) return { session, role: "sender" };
      if (session.receiver?.socket === socket) return { session, role: "receiver" };
    }
    return undefined;
  }

  destroy(sessionId: string): void {
    const session = this.sessionsById.get(sessionId);
    if (!session) return;
    this.sessionsById.delete(sessionId);
    this.sessionIdByPairingCode.delete(session.pairingCode);
    logger.info("session destroyed", { sessionId });
  }

  /** Periodic sweep to evict expired sessions and notify connected peers. */
  sweepExpired(): void {
    const now = Date.now();
    for (const session of this.sessionsById.values()) {
      if (now > session.expiresAt) {
        this.notifyExpired(session);
        this.destroy(session.id);
      }
    }
  }

  private notifyExpired(session: Session): void {
    const message = JSON.stringify({ type: "SESSION_EXPIRED", sessionId: session.id });
    for (const peer of [session.sender, session.receiver]) {
      if (peer && peer.socket.readyState === peer.socket.OPEN) {
        peer.socket.send(message);
      }
    }
  }

  get activeSessionCount(): number {
    return this.sessionsById.size;
  }
}
