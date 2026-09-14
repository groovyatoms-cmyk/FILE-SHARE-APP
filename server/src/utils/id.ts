import { randomBytes } from "node:crypto";

const SESSION_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateSessionId(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SESSION_ID_ALPHABET[bytes[i]! % SESSION_ID_ALPHABET.length];
  }
  return out;
}

export function generatePairingCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += (bytes[i]! % 10).toString();
  }
  return out;
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}
