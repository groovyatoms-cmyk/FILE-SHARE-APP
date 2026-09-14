// @vitest-environment node
// jsdom's Blob/File polyfill lacks a working arrayBuffer(); Node's native
// File/Blob (used by ChunkPump via file.slice().arrayBuffer()) works correctly.
import { describe, expect, it } from "vitest";
import { ChunkPump, type ChunkPumpDeps } from "./chunkPump";
import { IncrementalSha256 } from "../crypto/hash";

function makeFile(sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  return new File([bytes], "test.bin", { type: "application/octet-stream" });
}

function expectedDigest(sizeBytes: number): string {
  const hasher = new IncrementalSha256();
  const bytes = new Uint8Array(sizeBytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
  hasher.update(bytes);
  return hasher.digestHex();
}

function makeDeps(sent: { chunkIndex: number; byteLength: number; data: ArrayBuffer }[]): ChunkPumpDeps {
  return {
    sendMeta: (chunkIndex, byteLength) => {
      sent.push({ chunkIndex, byteLength, data: new ArrayBuffer(0) });
    },
    sendBinary: (data) => {
      sent[sent.length - 1]!.data = data;
    },
    getBufferedAmount: () => 0,
    setBufferedAmountLowThreshold: () => {},
    onBufferedAmountLow: () => () => {},
    onProgress: () => {},
  };
}

describe("ChunkPump", () => {
  it("sends every chunk in order and produces a checksum matching a direct hash of the file", async () => {
    const size = 10_000;
    const chunkSize = 1024;
    const totalChunks = Math.ceil(size / chunkSize);
    const file = makeFile(size);
    const sent: { chunkIndex: number; byteLength: number; data: ArrayBuffer }[] = [];
    const pump = new ChunkPump(file, 0, chunkSize, totalChunks, makeDeps(sent), null);

    const outcome = await pump.run(0);

    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed") {
      expect(outcome.checksum).toBe(expectedDigest(size));
    }
    expect(sent).toHaveLength(totalChunks);
    expect(sent.map((s) => s.chunkIndex)).toEqual(Array.from({ length: totalChunks }, (_, i) => i));
    const totalBytesSent = sent.reduce((sum, s) => sum + s.byteLength, 0);
    expect(totalBytesSent).toBe(size);
  });

  it("resumes from a given chunk and still produces the correct whole-file checksum", async () => {
    const size = 10_000;
    const chunkSize = 1024;
    const totalChunks = Math.ceil(size / chunkSize);
    const file = makeFile(size);
    const sent: { chunkIndex: number; byteLength: number; data: ArrayBuffer }[] = [];
    const pump = new ChunkPump(file, 0, chunkSize, totalChunks, makeDeps(sent), null);

    const outcome = await pump.run(5); // pretend chunks 0-4 were already delivered before a reconnect

    expect(outcome.status).toBe("completed");
    if (outcome.status === "completed") {
      expect(outcome.checksum).toBe(expectedDigest(size));
    }
    expect(sent[0]!.chunkIndex).toBe(5);
    expect(sent).toHaveLength(totalChunks - 5);
  });

  it("stops sending once cancelled", async () => {
    const size = 100_000;
    const chunkSize = 1024;
    const totalChunks = Math.ceil(size / chunkSize);
    const file = makeFile(size);
    const sent: { chunkIndex: number; byteLength: number; data: ArrayBuffer }[] = [];
    let callCount = 0;
    const deps = makeDeps(sent);
    const pump = new ChunkPump(file, 0, chunkSize, totalChunks, deps, null);
    const originalOnProgress = deps.onProgress;
    deps.onProgress = (bytes, idx) => {
      callCount++;
      if (callCount === 3) pump.cancel();
      originalOnProgress(bytes, idx);
    };

    const outcome = await pump.run(0);
    expect(outcome.status).toBe("cancelled");
    expect(sent.length).toBeLessThan(totalChunks);
  });
});
