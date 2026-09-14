/**
 * Optional application-level encryption layer, additive to WebRTC's own
 * DTLS-SRTP transport encryption. Uses the Web Crypto API exclusively —
 * no hand-rolled cryptography. Each chunk is encrypted independently with
 * AES-GCM under a per-session ephemeral key and a unique 96-bit IV derived
 * from the chunk index, which AES-GCM requires to never repeat under a key.
 */

export interface EncryptionSession {
  key: CryptoKey;
  /** Random per-session salt mixed into every IV so IVs never collide across sessions. */
  ivSalt: Uint8Array<ArrayBuffer>;
}

export async function generateEncryptionSession(): Promise<EncryptionSession> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const ivSalt = crypto.getRandomValues(new Uint8Array(4));
  return { key, ivSalt };
}

/** Exports the raw key so it can be transmitted once, out-of-band, over the encrypted control channel. */
export async function exportKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

export async function importKeyRaw(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

function ivForChunk(
  ivSalt: Uint8Array<ArrayBuffer>,
  fileIndex: number,
  chunkIndex: number,
): Uint8Array<ArrayBuffer> {
  // 4-byte random per-session salt + 4-byte fileIndex + 4-byte chunkIndex = 12-byte IV.
  // Uniqueness per (fileIndex, chunkIndex) pair is guaranteed under a given key, which is
  // the only requirement AES-GCM places on IVs.
  const iv = new Uint8Array(12);
  iv.set(ivSalt, 0);
  const view = new DataView(iv.buffer);
  view.setUint32(4, fileIndex >>> 0, false);
  view.setUint32(8, chunkIndex >>> 0, false);
  return iv;
}

export async function encryptChunk(
  session: EncryptionSession,
  fileIndex: number,
  chunkIndex: number,
  data: ArrayBuffer,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
  const iv = ivForChunk(session.ivSalt, fileIndex, chunkIndex);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, session.key, data);
  return { ciphertext, iv };
}

export async function decryptChunk(
  session: EncryptionSession,
  iv: Uint8Array<ArrayBuffer>,
  ciphertext: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, session.key, ciphertext);
}
