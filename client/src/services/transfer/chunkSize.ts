import { CHUNK_SIZE_LADDER } from "@p2p/shared";

/**
 * Adaptive chunk sizing: bigger files use bigger chunks to cut per-chunk
 * overhead (control message + ACK), while small files stay on small chunks
 * so progress/backpressure stays responsive. Bounded to devices with
 * reasonable memory via `navigator.deviceMemory` where available.
 */
export function selectChunkSize(fileSize: number, userPreference?: number): number {
  if (userPreference && CHUNK_SIZE_LADDER.includes(userPreference as (typeof CHUNK_SIZE_LADDER)[number])) {
    return userPreference;
  }

  const deviceMemoryGb = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

  let size: number;
  if (fileSize < 8 * 1024 * 1024) size = CHUNK_SIZE_LADDER[0]; // 64 KB
  else if (fileSize < 128 * 1024 * 1024) size = CHUNK_SIZE_LADDER[1]; // 128 KB
  else if (fileSize < 1024 * 1024 * 1024) size = CHUNK_SIZE_LADDER[2]; // 256 KB
  else if (fileSize < 4 * 1024 * 1024 * 1024) size = CHUNK_SIZE_LADDER[3]; // 512 KB
  else size = CHUNK_SIZE_LADDER[4]; // 1 MB

  // Low-memory devices cap out at 256 KB regardless of file size.
  if (deviceMemoryGb <= 2) {
    size = Math.min(size, CHUNK_SIZE_LADDER[2]);
  }

  return size;
}
