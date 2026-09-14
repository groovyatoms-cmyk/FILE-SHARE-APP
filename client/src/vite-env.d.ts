/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  /** Optional — resolveSignalingUrl() falls back to ws(s)://<host>:8080 when unset. */
  readonly VITE_SIGNALING_URL?: string;
  readonly VITE_STUN_SERVER: string;
  readonly VITE_TURN_SERVER?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
  readonly VITE_SESSION_TIMEOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
