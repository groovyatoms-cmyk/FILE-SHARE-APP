import { create } from "zustand";
import type { ConnectionState } from "@p2p/shared";

interface ConnectionStoreState {
  connectionState: ConnectionState;
  peerDisplayName: string | null;
  sessionId: string | null;
  /** Only ever populated on the sender side, for embedding in the QR payload. Never logged. */
  token: string | null;
  pairingCode: string | null;
  expiresAt: number | null;
  errorMessage: string | null;
  setConnectionState: (state: ConnectionState) => void;
  setPeer: (name: string | null) => void;
  setSession: (sessionId: string | null, token: string | null, pairingCode: string | null, expiresAt: number | null) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initial = {
  connectionState: "CREATING_SESSION" as ConnectionState,
  peerDisplayName: null,
  sessionId: null,
  token: null,
  pairingCode: null,
  expiresAt: null,
  errorMessage: null,
};

export const useConnectionStore = create<ConnectionStoreState>((set) => ({
  ...initial,
  setConnectionState: (connectionState) => set({ connectionState }),
  setPeer: (peerDisplayName) => set({ peerDisplayName }),
  setSession: (sessionId, token, pairingCode, expiresAt) => set({ sessionId, token, pairingCode, expiresAt }),
  setError: (errorMessage) => set({ errorMessage }),
  reset: () => set({ ...initial }),
}));
