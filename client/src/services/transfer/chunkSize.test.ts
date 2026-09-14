import { describe, expect, it } from "vitest";
import { selectChunkSize } from "./chunkSize";
import { CHUNK_SIZE_LADDER } from "@p2p/shared";

describe("selectChunkSize", () => {
  it("uses the smallest chunk size for small files", () => {
    expect(selectChunkSize(1024)).toBe(CHUNK_SIZE_LADDER[0]);
  });

  it("scales up chunk size for larger files", () => {
    expect(selectChunkSize(500 * 1024 * 1024)).toBe(CHUNK_SIZE_LADDER[2]);
    expect(selectChunkSize(5 * 1024 * 1024 * 1024)).toBe(CHUNK_SIZE_LADDER[4]);
  });

  it("honors a valid user preference over the automatic ladder", () => {
    expect(selectChunkSize(5 * 1024 * 1024 * 1024, CHUNK_SIZE_LADDER[0])).toBe(CHUNK_SIZE_LADDER[0]);
  });

  it("ignores an invalid user preference not on the ladder", () => {
    expect(selectChunkSize(1024, 12345)).toBe(CHUNK_SIZE_LADDER[0]);
  });
});
