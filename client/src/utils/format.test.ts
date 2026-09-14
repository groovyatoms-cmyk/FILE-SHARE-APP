import { describe, expect, it } from "vitest";
import { formatBytes, formatEta, formatPercent } from "./format";

describe("formatBytes", () => {
  it("formats bytes below 1024 without decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats megabytes with one decimal", () => {
    expect(formatBytes(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });

  it("formats gigabytes", () => {
    expect(formatBytes(5.6 * 1024 * 1024 * 1024)).toBe("5.6 GB");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("formatEta", () => {
  it("formats seconds under a minute as mm:ss", () => {
    expect(formatEta(9)).toBe("00:09");
  });

  it("formats seconds over an hour with an hour component", () => {
    expect(formatEta(3661)).toBe("01:01:01");
  });

  it("returns a placeholder for infinite/negative values", () => {
    expect(formatEta(Infinity)).toBe("--:--");
    expect(formatEta(-1)).toBe("--:--");
  });
});

describe("formatPercent", () => {
  it("clamps and rounds to whole percent", () => {
    expect(formatPercent(0.744)).toBe("74%");
    expect(formatPercent(1.5)).toBe("100%");
    expect(formatPercent(-0.5)).toBe("0%");
  });
});
