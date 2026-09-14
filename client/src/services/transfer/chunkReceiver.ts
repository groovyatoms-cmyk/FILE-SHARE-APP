import { hexToBytes } from "@noble/hashes/utils";
import type { FileMetadata } from "@p2p/shared";
import { IncrementalSha256 } from "../crypto/hash";
import { decryptChunk, type EncryptionSession } from "../crypto/encryption";
import type { ChunkSink } from "../storage/fileWriter";

export interface ChunkReceiverDeps {
  onProgress: (bytesReceived: number, chunkIndex: number) => void;
  encryption: EncryptionSession | null;
}

/**
 * Accumulates incoming chunks for one file. The running SHA-256 hash and
 * the set of received chunk indices live in this object's memory for the
 * lifetime of the page — so a WebRTC reconnect mid-transfer (the data
 * channel dying and being renegotiated) never loses hashing progress or
 * forces a restart from zero, as long as the tab stays open. Recovering a
 * transfer across a full page reload is out of scope for this build (the
 * checkpoint is still persisted for future use, see storage/db.ts).
 */
export class ChunkReceiver {
  private readonly hasher = new IncrementalSha256();
  private readonly receivedChunks = new Set<number>();
  private digested = false;

  constructor(
    private readonly metadata: FileMetadata,
    private readonly sink: ChunkSink,
    private readonly deps: ChunkReceiverDeps,
  ) {}

  async handleChunk(chunkIndex: number, ivHex: string | undefined, payload: ArrayBuffer): Promise<void> {
    if (this.digested) return; // FILE_COMPLETE already finalized this file's hash — never touch it again
    if (this.receivedChunks.has(chunkIndex)) return; // duplicate delivery — ignore rather than double-hash

    let plaintext = payload;
    if (this.deps.encryption && ivHex) {
      plaintext = await decryptChunk(this.deps.encryption, new Uint8Array(hexToBytes(ivHex)), payload);
    }

    const byteOffset = chunkIndex * this.metadata.chunkSize;
    await this.sink.write(chunkIndex, byteOffset, plaintext);

    // Chunks always arrive in ascending order within one connection (the
    // data channel is ordered+reliable), and resume always restarts the
    // sender exactly at our next expected chunk — so folding into the
    // running hash here is always in the correct order.
    this.hasher.update(new Uint8Array(plaintext));
    this.receivedChunks.add(chunkIndex);
    this.deps.onProgress(plaintext.byteLength, chunkIndex);
  }

  /** Highest chunk index N such that every chunk [0, N) has been received — the correct resume point. */
  get resumeFromChunk(): number {
    let n = 0;
    while (this.receivedChunks.has(n)) n++;
    return n;
  }

  get isComplete(): boolean {
    return this.receivedChunks.size >= this.metadata.totalChunks && this.resumeFromChunk >= this.metadata.totalChunks;
  }

  digestHex(): string {
    this.digested = true;
    return this.hasher.digestHex();
  }

  async finalize(): Promise<Blob | null> {
    return this.sink.finalize();
  }

  async abort(): Promise<void> {
    await this.sink.abort();
  }
}

export function checksumsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  // Constant-time-ish comparison; not security critical (integrity check, not a secret) but cheap to do properly.
  let diff = 0;
  const bytesA = hexToBytes(a);
  const bytesB = hexToBytes(b);
  if (bytesA.length !== bytesB.length) return false;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i]! ^ bytesB[i]!;
  return diff === 0;
}
