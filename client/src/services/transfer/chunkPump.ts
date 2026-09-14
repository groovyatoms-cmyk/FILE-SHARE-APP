import { BUFFERED_AMOUNT_HIGH_WATERMARK, BUFFERED_AMOUNT_LOW_WATERMARK } from "@p2p/shared";
import { IncrementalSha256 } from "../crypto/hash";
import { encryptChunk, type EncryptionSession } from "../crypto/encryption";
import { bytesToHex } from "@noble/hashes/utils";

export interface ChunkPumpDeps {
  sendMeta: (chunkIndex: number, byteLength: number, iv: string | undefined) => void;
  sendBinary: (data: ArrayBuffer) => void;
  getBufferedAmount: () => number;
  setBufferedAmountLowThreshold: (bytes: number) => void;
  onBufferedAmountLow: (handler: () => void) => () => void;
  onProgress: (bytesSentThisChunk: number, chunkIndex: number) => void;
}

export type PumpOutcome = { status: "completed"; checksum: string } | { status: "cancelled" };

/**
 * Streams a File's chunks over an already-open data channel, honoring
 * WebRTC backpressure via bufferedAmount / bufferedamountlow, and folds a
 * running SHA-256 digest over the plaintext as it reads — so integrity
 * verification never requires a second full pass over a multi-gigabyte file.
 */
export class ChunkPump {
  private paused = false;
  private cancelled = false;
  private resumeWaiters: (() => void)[] = [];

  constructor(
    private readonly file: File,
    private readonly fileIndex: number,
    private readonly chunkSize: number,
    private readonly totalChunks: number,
    private readonly deps: ChunkPumpDeps,
    private readonly encryption: EncryptionSession | null,
  ) {
    this.deps.setBufferedAmountLowThreshold(BUFFERED_AMOUNT_LOW_WATERMARK);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.resumeWaiters.forEach((w) => w());
    this.resumeWaiters = [];
  }

  cancel(): void {
    this.cancelled = true;
    this.resume();
  }

  private waitForResume(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => this.resumeWaiters.push(resolve));
  }

  private waitForBufferSpace(): Promise<void> {
    if (this.deps.getBufferedAmount() < BUFFERED_AMOUNT_HIGH_WATERMARK) return Promise.resolve();
    return new Promise((resolve) => {
      const unsubscribe = this.deps.onBufferedAmountLow(() => {
        unsubscribe();
        resolve();
      });
    });
  }

  /** Runs the send loop starting at `fromChunk` (0 for a fresh transfer, >0 to resume). */
  async run(fromChunk: number): Promise<PumpOutcome> {
    const hasher = new IncrementalSha256();

    // A resumed transfer still needs the checksum of chunks already sent
    // (and presumed received) folded in, so the final digest matches the
    // whole file, not just the tail we re-send.
    if (fromChunk > 0) {
      await this.hashAlreadySentRange(hasher, fromChunk);
    }

    for (let i = fromChunk; i < this.totalChunks; i++) {
      if (this.cancelled) return { status: "cancelled" };
      await this.waitForResume();
      if (this.cancelled) return { status: "cancelled" };
      await this.waitForBufferSpace();
      if (this.cancelled) return { status: "cancelled" };

      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const slice = this.file.slice(start, end);
      const buffer = await slice.arrayBuffer();
      hasher.update(new Uint8Array(buffer));

      let payload: ArrayBuffer = buffer;
      let ivHex: string | undefined;
      if (this.encryption) {
        const { ciphertext, iv } = await encryptChunk(this.encryption, this.fileIndex, i, buffer);
        payload = ciphertext;
        ivHex = bytesToHex(iv);
      }

      this.deps.sendMeta(i, payload.byteLength, ivHex);
      this.deps.sendBinary(payload);
      this.deps.onProgress(end - start, i);
    }

    return { status: "completed", checksum: hasher.digestHex() };
  }

  /** Re-reads chunks 0..uptoChunk in bounded pieces to keep memory flat even on resume. */
  private async hashAlreadySentRange(hasher: IncrementalSha256, uptoChunk: number): Promise<void> {
    for (let i = 0; i < uptoChunk; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const buffer = await this.file.slice(start, end).arrayBuffer();
      hasher.update(new Uint8Array(buffer));
    }
  }
}
