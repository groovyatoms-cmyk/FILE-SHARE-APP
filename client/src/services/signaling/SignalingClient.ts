import type { SignalingEnvelope, SignalingMessageType } from "@p2p/shared";

type Listener = (envelope: SignalingEnvelope) => void;

export type SignalingConnectionState = "idle" | "connecting" | "open" | "reconnecting" | "closed";

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 6;
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Thin, typed wrapper around the signaling WebSocket. Handles reconnection
 * with backoff so a brief network blip doesn't abort a pairing session, and
 * exposes a simple pub/sub API keyed by message type.
 */
export class SignalingClient {
  private socket: WebSocket | null = null;
  private listeners = new Map<SignalingMessageType, Set<Listener>>();
  private stateListeners = new Set<(state: SignalingConnectionState) => void>();
  private state: SignalingConnectionState = "idle";
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly url: string) {}

  connect(): Promise<void> {
    if (!this.url) {
      return Promise.reject(
        new Error(
          "No signaling server URL configured (VITE_SIGNALING_URL is missing). Check your .env file.",
        ),
      );
    }
    this.manuallyClosed = false;
    return this.openSocket();
  }

  private openSocket(): Promise<void> {
    this.setState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        fn();
      };

      // A firewall or blocked port can silently drop the connection attempt
      // without ever firing 'error' or 'close' — without this, the caller's
      // promise (and thus the whole UI, which awaits it) would hang forever.
      const timeoutTimer = setTimeout(() => {
        this.socket?.close();
        settle(() =>
          reject(
            new Error(
              `Could not reach the signaling server at ${this.url} within ${CONNECT_TIMEOUT_MS / 1000}s. Check that it's running and reachable.`,
            ),
          ),
        );
      }, CONNECT_TIMEOUT_MS);

      let socket: WebSocket;
      try {
        socket = new WebSocket(this.url);
      } catch (err) {
        settle(() => reject(err instanceof Error ? err : new Error("Failed to open a WebSocket connection")));
        return;
      }
      this.socket = socket;

      socket.addEventListener("open", () => {
        this.reconnectAttempts = 0;
        this.setState("open");
        settle(resolve);
      });

      socket.addEventListener("message", (event) => {
        try {
          const envelope: SignalingEnvelope = JSON.parse(event.data);
          this.dispatch(envelope);
        } catch {
          // Malformed frame from the server — ignore rather than crash the session.
        }
      });

      socket.addEventListener("close", () => {
        if (this.manuallyClosed) {
          this.setState("closed");
          settle(() => reject(new Error("Signaling connection closed")));
          return;
        }
        settle(() => reject(new Error("Failed to connect to signaling server")));
        this.scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        // 'close' fires right after 'error' for browser WebSockets and carries
        // the actual reject/reconnect logic above; nothing further to do here.
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.setState("closed");
      return;
    }
    this.setState("reconnecting");
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.openSocket().catch(() => {
        // openSocket's own close handler will schedule the next attempt.
      });
    }, delay);
  }

  send(envelope: SignalingEnvelope): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(envelope));
    }
  }

  on(type: SignalingMessageType, handler: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  onStateChange(handler: (state: SignalingConnectionState) => void): () => void {
    this.stateListeners.add(handler);
    return () => this.stateListeners.delete(handler);
  }

  private dispatch(envelope: SignalingEnvelope): void {
    this.listeners.get(envelope.type)?.forEach((handler) => handler(envelope));
  }

  private setState(state: SignalingConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((handler) => handler(state));
  }

  get connectionState(): SignalingConnectionState {
    return this.state;
  }

  close(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }
}
