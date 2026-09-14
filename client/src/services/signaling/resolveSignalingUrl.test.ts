import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveSignalingUrl } from "./resolveSignalingUrl";

describe("resolveSignalingUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses VITE_SIGNALING_URL when configured", () => {
    vi.stubEnv("VITE_SIGNALING_URL", "wss://signal.example.com");
    expect(resolveSignalingUrl()).toBe("wss://signal.example.com");
  });

  it("falls back to ws://<hostname>:8080 when unset, rather than producing ws://.../undefined", () => {
    vi.stubEnv("VITE_SIGNALING_URL", "");
    const url = resolveSignalingUrl();
    expect(url).not.toContain("undefined");
    expect(url).toMatch(/^wss?:\/\/.+:8080$/);
  });
});
