import { describe, expect, it, vi } from "vitest";
import { SessionManager } from "./sessionManager.js";

function fakeSocket() {
  return { readyState: 1, OPEN: 1, send: vi.fn() } as unknown as import("ws").WebSocket;
}

describe("SessionManager", () => {
  it("creates a session with a unique id, token and pairing code", () => {
    const manager = new SessionManager();
    const session = manager.createSession(fakeSocket(), "Chrome on Windows");
    expect(session.id).toHaveLength(8);
    expect(session.token.length).toBeGreaterThan(16);
    expect(session.pairingCode).toHaveLength(6);
    expect(session.consumed).toBe(false);
  });

  it("resolves a session by pairing code", () => {
    const manager = new SessionManager();
    const session = manager.createSession(fakeSocket(), "Sender");
    const resolved = manager.resolvePairingCode(session.pairingCode);
    expect(resolved?.id).toBe(session.id);
  });

  it("expires sessions after their timeout", () => {
    const manager = new SessionManager();
    const session = manager.createSession(fakeSocket(), "Sender", 1);
    session.expiresAt = Date.now() - 1000; // force expiry
    expect(manager.isExpired(session)).toBe(true);
    expect(manager.getById(session.id)).toBeUndefined();
  });

  it("marks a session consumed once a receiver joins", () => {
    const manager = new SessionManager();
    const session = manager.createSession(fakeSocket(), "Sender");
    manager.joinAsReceiver(session, fakeSocket(), "Receiver");
    expect(session.consumed).toBe(true);
    expect(session.receiver?.displayName).toBe("Receiver");
  });

  it("destroys a session and frees its pairing code", () => {
    const manager = new SessionManager();
    const session = manager.createSession(fakeSocket(), "Sender");
    manager.destroy(session.id);
    expect(manager.getById(session.id)).toBeUndefined();
    expect(manager.resolvePairingCode(session.pairingCode)).toBeUndefined();
  });
});
