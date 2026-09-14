import { chunkRepository } from "./db";

export interface ChunkSink {
  write(chunkIndex: number, byteOffset: number, data: ArrayBuffer): Promise<void>;
  /** Returns a Blob for the IndexedDB fallback (caller downloads it); null when already written to disk. */
  finalize(): Promise<Blob | null>;
  abort(): Promise<void>;
}

/**
 * Writes incoming chunks directly to disk via the File System Access API,
 * at their absolute byte offset. This is the only path that lets a 5-10 GB
 * incoming transfer avoid ever holding the whole file in memory or in
 * IndexedDB — each chunk is released as soon as it's flushed to disk.
 */
export class FileSystemChunkSink implements ChunkSink {
  constructor(private readonly writable: FileSystemWritableFileStream) {}

  async write(_chunkIndex: number, byteOffset: number, data: ArrayBuffer): Promise<void> {
    await this.writable.write({ type: "write", position: byteOffset, data });
  }

  async finalize(): Promise<null> {
    await this.writable.close();
    return null;
  }

  async abort(): Promise<void> {
    try {
      await this.writable.abort();
    } catch {
      // Already closed/aborted — nothing further to do.
    }
  }
}

/**
 * Fallback sink for browsers without the File System Access API (Firefox,
 * Safari, most mobile browsers): chunks are persisted to IndexedDB as they
 * arrive (never held in a growing in-memory array), and reassembled into a
 * single Blob only once, at finalize time, for the user to download.
 */
export class IndexedDbChunkSink implements ChunkSink {
  constructor(
    private readonly fileId: string,
    private readonly mimeType: string,
  ) {}

  async write(chunkIndex: number, _byteOffset: number, data: ArrayBuffer): Promise<void> {
    await chunkRepository.put(this.fileId, chunkIndex, data);
  }

  async finalize(): Promise<Blob> {
    const records = await chunkRepository.getAllForFile(this.fileId);
    const blob = new Blob(
      records.map((r) => r.data),
      { type: this.mimeType },
    );
    await chunkRepository.deleteAllForFile(this.fileId);
    return blob;
  }

  async abort(): Promise<void> {
    await chunkRepository.deleteAllForFile(this.fileId);
  }
}

export function supportsFileSystemAccess(): boolean {
  return typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === "function";
}
