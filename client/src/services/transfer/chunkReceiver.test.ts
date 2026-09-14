import { describe, expect, it } from "vitest";
import type { FileMetadata } from "@p2p/shared";
import { ChunkReceiver, checksumsMatch } from "./chunkReceiver";
import type { ChunkSink } from "../storage/fileWriter";
import { IncrementalSha256 } from "../crypto/hash";
import { bytesToHex } from "@noble/hashes/utils";

class MemorySink implements ChunkSink {
  written: { chunkIndex: number; data: ArrayBuffer }[] = [];
  async write(chunkIndex: number, _offset: number, data: ArrayBuffer) {
    this.written.push({ chunkIndex, data });
  }
  async finalize() {
    return null;
  }
  async abort() {}
}

function metadata(overrides: Partial<FileMetadata> = {}): FileMetadata {
  return {
    id: "f1",
    name: "video.mp4",
    size: 3000,
    type: "video/mp4",
    lastModified: Date.now(),
    totalChunks: 3,
    chunkSize: 1000,
    ...overrides,
  };
}

describe("ChunkReceiver", () => {
  it("computes a running checksum matching a direct digest of the reassembled bytes", async () => {
    const chunks = [new Uint8Array(1000).fill(1), new Uint8Array(1000).fill(2), new Uint8Array(1000).fill(3)];
    const sink = new MemorySink();
    const receiver = new ChunkReceiver(metadata(), sink, { onProgress: () => {}, encryption: null });

    for (let i = 0; i < chunks.length; i++) {
      await receiver.handleChunk(i, undefined, chunks[i]!.buffer);
    }

    const expected = new IncrementalSha256();
    chunks.forEach((c) => expected.update(c));

    expect(receiver.digestHex()).toBe(expected.digestHex());
    expect(receiver.isComplete).toBe(true);
  });

  it("tracks the resume point as the first gap in received chunks", async () => {
    const sink = new MemorySink();
    const receiver = new ChunkReceiver(metadata(), sink, { onProgress: () => {}, encryption: null });

    await receiver.handleChunk(0, undefined, new ArrayBuffer(1000));
    await receiver.handleChunk(1, undefined, new ArrayBuffer(1000));
    expect(receiver.resumeFromChunk).toBe(2);
    expect(receiver.isComplete).toBe(false);
  });

  it("ignores duplicate chunk deliveries", async () => {
    const sink = new MemorySink();
    const receiver = new ChunkReceiver(metadata({ totalChunks: 1, chunkSize: 4, size: 4 }), sink, {
      onProgress: () => {},
      encryption: null,
    });
    const data = new Uint8Array([1, 2, 3, 4]).buffer;
    await receiver.handleChunk(0, undefined, data);
    await receiver.handleChunk(0, undefined, data);
    expect(sink.written).toHaveLength(1);
  });
});

describe("checksumsMatch", () => {
  it("returns true for identical hex digests", () => {
    const hex = bytesToHex(new Uint8Array(32).fill(7));
    expect(checksumsMatch(hex, hex)).toBe(true);
  });

  it("returns false for differing digests", () => {
    const a = bytesToHex(new Uint8Array(32).fill(1));
    const b = bytesToHex(new Uint8Array(32).fill(2));
    expect(checksumsMatch(a, b)).toBe(false);
  });
});
