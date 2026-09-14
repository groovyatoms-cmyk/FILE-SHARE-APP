import { describe, expect, it, vi, afterEach } from "vitest";
import { detectDeviceLabel } from "./deviceInfo";

function withUserAgent(ua: string, fn: () => void) {
  const spy = vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  try {
    fn();
  } finally {
    spy.mockRestore();
  }
}

describe("detectDeviceLabel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("identifies Chrome on Android", () => {
    withUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
      () => expect(detectDeviceLabel()).toBe("Chrome on Android"),
    );
  });

  it("identifies Safari on iPhone", () => {
    withUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/604.1",
      () => expect(detectDeviceLabel()).toBe("Safari on iPhone"),
    );
  });

  it("identifies Firefox on Linux", () => {
    withUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0", () =>
      expect(detectDeviceLabel()).toBe("Firefox on Linux"),
    );
  });

  it("identifies Edge on Windows", () => {
    withUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0",
      () => expect(detectDeviceLabel()).toBe("Edge on Windows"),
    );
  });
});
