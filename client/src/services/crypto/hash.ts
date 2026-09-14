import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

/**
 * Incremental SHA-256 hasher. Web Crypto's SubtleCrypto has no streaming
 * digest API, so multi-gigabyte files would otherwise need to be buffered
 * entirely in memory just to compute a checksum. @noble/hashes exposes a
 * proper update()/digest() interface that lets us hash chunk-by-chunk as
 * data is read or received.
 */
export class IncrementalSha256 {
  private readonly hasher = sha256.create();

  update(chunk: Uint8Array): void {
    this.hasher.update(chunk);
  }

  digestHex(): string {
    return bytesToHex(this.hasher.digest());
  }
}

export async function sha256HexOfBlob(blob: Blob, chunkSize = 1024 * 1024): Promise<string> {
  const hasher = new IncrementalSha256();
  let offset = 0;
  while (offset < blob.size) {
    const slice = blob.slice(offset, offset + chunkSize);
    const buffer = await slice.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += chunkSize;
  }
  return hasher.digestHex();
}
