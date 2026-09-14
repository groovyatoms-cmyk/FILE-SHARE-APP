import { describe, expect, it } from "vitest";
import { fileMetadataSchema, qrPairingPayloadSchema, sanitizeFileName } from "./schemas.js";
import { PROTOCOL_VERSION } from "./constants.js";

describe("sanitizeFileName", () => {
  it("strips path traversal segments", () => {
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
  });

  it("strips path separators", () => {
    expect(sanitizeFileName("a/b\\c")).toBe("a_b_c");
  });

  it("falls back to a default name when empty after sanitizing", () => {
    expect(sanitizeFileName("   ")).toBe("unnamed_file");
  });

  it("leaves normal file names untouched", () => {
    expect(sanitizeFileName("report-final(v2).pdf")).toBe("report-final(v2).pdf");
  });
});

describe("fileMetadataSchema", () => {
  const base = {
    id: "f1",
    name: "video.mp4",
    size: 1024,
    type: "video/mp4",
    lastModified: Date.now(),
    totalChunks: 4,
    chunkSize: 256 * 1024,
  };

  it("accepts valid metadata", () => {
    expect(fileMetadataSchema.safeParse(base).success).toBe(true);
  });

  it("rejects file names containing path separators", () => {
    const result = fileMetadataSchema.safeParse({ ...base, name: "../../evil.sh" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed checksum", () => {
    const result = fileMetadataSchema.safeParse({ ...base, checksum: "not-hex" });
    expect(result.success).toBe(false);
  });
});

describe("qrPairingPayloadSchema", () => {
  it("accepts a well-formed payload", () => {
    const payload = {
      version: PROTOCOL_VERSION,
      sessionId: "7F3K9P2X",
      token: "a".repeat(32),
      signalingUrl: "wss://signal.example.com",
      expiresAt: Date.now() + 60_000,
    };
    expect(qrPairingPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects a payload with the wrong protocol version", () => {
    const payload = {
      version: 999,
      sessionId: "7F3K9P2X",
      token: "a".repeat(32),
      signalingUrl: "wss://signal.example.com",
      expiresAt: Date.now() + 60_000,
    };
    expect(qrPairingPayloadSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a non-websocket signaling url that isn't a valid url at all", () => {
    const payload = {
      version: PROTOCOL_VERSION,
      sessionId: "7F3K9P2X",
      token: "a".repeat(32),
      signalingUrl: "not-a-url",
      expiresAt: Date.now() + 60_000,
    };
    expect(qrPairingPayloadSchema.safeParse(payload).success).toBe(false);
  });
});
