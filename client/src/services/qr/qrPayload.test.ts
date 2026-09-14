import { describe, expect, it } from "vitest";
import { buildQrPayload, buildShareLink, parseQrPayload, parseShareLink } from "./qrPayload";

describe("qrPayload", () => {
  it("round-trips a valid payload", () => {
    const raw = buildQrPayload({
      sessionId: "7F3K9P2X",
      token: "a".repeat(32),
      signalingUrl: "wss://signal.example.com",
      expiresAt: Date.now() + 60_000,
    });
    const result = parseQrPayload(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.sessionId).toBe("7F3K9P2X");
  });

  it("rejects malformed JSON", () => {
    expect(parseQrPayload("not json")).toEqual({ ok: false, reason: "invalid-format" });
  });

  it("rejects an expired payload", () => {
    const raw = buildQrPayload({
      sessionId: "7F3K9P2X",
      token: "a".repeat(32),
      signalingUrl: "wss://signal.example.com",
      expiresAt: Date.now() - 1000,
    });
    expect(parseQrPayload(raw)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a payload failing schema validation", () => {
    expect(parseQrPayload(JSON.stringify({ foo: "bar" }))).toEqual({ ok: false, reason: "invalid-schema" });
  });

  it("builds and parses a share link", () => {
    const link = buildShareLink(
      {
        version: 1,
        sessionId: "7F3K9P2X",
        token: "a".repeat(32),
        signalingUrl: "wss://signal.example.com",
        expiresAt: Date.now() + 60_000,
      },
      "https://app.example.com",
    );
    const url = new URL(link);
    const result = parseShareLink(url.search);
    expect(result.ok).toBe(true);
  });
});
