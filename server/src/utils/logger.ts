/**
 * Safe logging abstraction. Never pass file contents, chunk payloads,
 * encryption keys, or full session tokens through this logger.
 */

type Level = "debug" | "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

const levelRank: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = isProduction ? "info" : "debug";

function shouldLog(level: Level): boolean {
  return levelRank[level] >= levelRank[minLevel];
}

function format(level: Level, message: string, meta?: Record<string, unknown>): string {
  const time = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(redact(meta))}` : "";
  return `[${time}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

const SENSITIVE_KEYS = new Set(["token", "checksum", "key", "iv", "sdp", "candidate", "password"]);

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("debug")) console.debug(format("debug", message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("info")) console.info(format("info", message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("warn")) console.warn(format("warn", message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog("error")) console.error(format("error", message, meta));
  },
};
