import { PROTOCOL_VERSION, qrPairingPayloadSchema, type QrPairingPayload } from "@p2p/shared";

export function buildQrPayload(params: {
  sessionId: string;
  token: string;
  signalingUrl: string;
  expiresAt: number;
}): string {
  const payload: QrPairingPayload = {
    version: PROTOCOL_VERSION,
    sessionId: params.sessionId,
    token: params.token,
    signalingUrl: params.signalingUrl,
    expiresAt: params.expiresAt,
  };
  return JSON.stringify(payload);
}

export type QrParseResult =
  | { ok: true; payload: QrPairingPayload }
  | { ok: false; reason: "invalid-format" | "invalid-schema" | "expired" };

export function parseQrPayload(raw: string): QrParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid-format" };
  }

  const result = qrPairingPayloadSchema.safeParse(json);
  if (!result.success) return { ok: false, reason: "invalid-schema" };

  if (result.data.expiresAt < Date.now()) return { ok: false, reason: "expired" };

  return { ok: true, payload: result.data };
}

/** Builds a shareable deep link that encodes the same pairing info as the QR code. */
export function buildShareLink(payload: QrPairingPayload, origin: string): string {
  const url = new URL(`/receive/scan`, origin);
  url.searchParams.set("d", encodeURIComponent(JSON.stringify(payload)));
  return url.toString();
}

export function parseShareLink(search: string): QrParseResult {
  const params = new URLSearchParams(search);
  const data = params.get("d");
  if (!data) return { ok: false, reason: "invalid-format" };
  try {
    return parseQrPayload(decodeURIComponent(data));
  } catch {
    return { ok: false, reason: "invalid-format" };
  }
}
