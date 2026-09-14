export const PROTOCOL_VERSION = 1;

export const DEFAULT_CHUNK_SIZE = 256 * 1024; // 256 KB
export const MIN_CHUNK_SIZE = 64 * 1024; // 64 KB
export const MAX_CHUNK_SIZE = 1024 * 1024; // 1 MB

export const CHUNK_SIZE_LADDER = [
  64 * 1024,
  128 * 1024,
  256 * 1024,
  512 * 1024,
  1024 * 1024,
] as const;

// DataChannel backpressure thresholds
export const BUFFERED_AMOUNT_HIGH_WATERMARK = 8 * 1024 * 1024; // 8 MB: stop sending
export const BUFFERED_AMOUNT_LOW_WATERMARK = 1 * 1024 * 1024; // 1 MB: resume sending

export const DEFAULT_SESSION_TIMEOUT_SECONDS = 30 * 60; // 30 minutes
export const MIN_SESSION_TIMEOUT_SECONDS = 10 * 60;
export const MAX_SESSION_TIMEOUT_SECONDS = 60 * 60;

export const SESSION_ID_LENGTH = 8;
export const PAIRING_CODE_LENGTH = 6;

// Signaling server message size / rate limits
export const MAX_SIGNALING_MESSAGE_BYTES = 64 * 1024;
export const SIGNALING_RATE_LIMIT_WINDOW_MS = 10_000;
export const SIGNALING_RATE_LIMIT_MAX_MESSAGES = 100;

export const MAX_FILES_PER_TRANSFER = 500;
export const MAX_FILENAME_LENGTH = 255;
