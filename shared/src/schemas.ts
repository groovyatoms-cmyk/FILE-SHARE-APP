import { z } from "zod";
import {
  MAX_FILENAME_LENGTH,
  MAX_FILES_PER_TRANSFER,
  MAX_SESSION_TIMEOUT_SECONDS,
  MIN_SESSION_TIMEOUT_SECONDS,
  PROTOCOL_VERSION,
} from "./constants.js";

// A conservative filename validator: rejects path traversal and separators.
// Sanitization (stripping) still happens separately on top of this check.
const safeFileNameSchema = z
  .string()
  .min(1)
  .max(MAX_FILENAME_LENGTH)
  .refine((name) => !name.includes("/") && !name.includes("\\"), {
    message: "File name must not contain path separators",
  })
  .refine((name) => name !== "." && name !== "..", {
    message: "File name must not be a relative path segment",
  });

export const fileMetadataSchema = z.object({
  id: z.string().min(1).max(128),
  name: safeFileNameSchema,
  size: z.number().int().nonnegative(),
  type: z.string().max(255),
  lastModified: z.number().int().nonnegative(),
  totalChunks: z.number().int().positive(),
  chunkSize: z.number().int().positive(),
  relativePath: z.string().max(1024).optional(),
  checksum: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const qrPairingPayloadSchema = z.object({
  version: z.literal(PROTOCOL_VERSION),
  sessionId: z.string().min(4).max(32),
  token: z.string().min(16).max(256),
  signalingUrl: z.string().url(),
  expiresAt: z.number().int().positive(),
});

export const createSessionPayloadSchema = z.object({
  displayName: z.string().min(1).max(64),
  timeoutSeconds: z
    .number()
    .int()
    .min(MIN_SESSION_TIMEOUT_SECONDS)
    .max(MAX_SESSION_TIMEOUT_SECONDS)
    .optional(),
});

export const joinSessionPayloadSchema = z
  .object({
    sessionId: z.string().min(4).max(32).optional(),
    token: z.string().min(16).max(256).optional(),
    pairingCode: z.string().min(4).max(12).optional(),
    displayName: z.string().min(1).max(64),
  })
  .refine((v) => (v.sessionId && v.token) || v.pairingCode, {
    message: "Either sessionId+token or pairingCode must be provided",
  });

export const sdpPayloadSchema = z.object({
  sdp: z.object({
    type: z.enum(["offer", "answer", "pranswer", "rollback"]),
    sdp: z.string().max(200_000).optional(),
  }),
});

export const iceCandidatePayloadSchema = z.object({
  candidate: z.object({
    candidate: z.string().max(4096).optional(),
    sdpMid: z.string().max(256).nullable().optional(),
    sdpMLineIndex: z.number().int().nullable().optional(),
    usernameFragment: z.string().max(256).nullable().optional(),
  }),
});

export const fileOfferSchema = z.object({
  type: z.literal("FILE_OFFER"),
  ts: z.number(),
  transferId: z.string().min(1).max(128),
  files: z.array(fileMetadataSchema).min(1).max(MAX_FILES_PER_TRANSFER),
});

export function sanitizeFileName(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/\.\.+/g, "_");
  const trimmed = base.trim().slice(0, MAX_FILENAME_LENGTH);
  return trimmed.length > 0 ? trimmed : "unnamed_file";
}
