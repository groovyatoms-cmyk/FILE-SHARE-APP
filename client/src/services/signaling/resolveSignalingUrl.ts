const DEFAULT_SIGNALING_PORT = 8080;

/**
 * Resolves the signaling server URL to connect to. Falls back to
 * `<ws|wss>://<current-hostname>:8080` when VITE_SIGNALING_URL isn't set,
 * so a plain `npm run dev` (no .env file created) still works for local
 * development instead of the WebSocket constructor silently coercing
 * `undefined` to the string "undefined" and resolving it as a relative
 * URL against the current page (producing something like
 * ws://localhost:5173/receive/undefined — a real bug this fixes).
 */
export function resolveSignalingUrl(): string {
  const configured = import.meta.env.VITE_SIGNALING_URL;
  if (configured) return configured;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${DEFAULT_SIGNALING_PORT}`;
}
