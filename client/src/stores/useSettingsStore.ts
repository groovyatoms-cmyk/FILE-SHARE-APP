import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CHUNK_SIZE, DEFAULT_SESSION_TIMEOUT_SECONDS } from "@p2p/shared";

export type AppearanceMode = "light" | "dark" | "system";

interface SettingsState {
  appearance: AppearanceMode;
  deviceName: string;
  chunkSize: number;
  autoResume: boolean;
  confirmIncomingTransfers: boolean;
  applicationEncryption: boolean;
  sessionTimeoutSeconds: number;
  setAppearance: (mode: AppearanceMode) => void;
  setDeviceName: (name: string) => void;
  setChunkSize: (size: number) => void;
  setAutoResume: (v: boolean) => void;
  setConfirmIncomingTransfers: (v: boolean) => void;
  setApplicationEncryption: (v: boolean) => void;
  setSessionTimeoutSeconds: (seconds: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appearance: "system",
      deviceName: "",
      chunkSize: DEFAULT_CHUNK_SIZE,
      autoResume: true,
      confirmIncomingTransfers: true,
      applicationEncryption: false,
      sessionTimeoutSeconds: DEFAULT_SESSION_TIMEOUT_SECONDS,
      setAppearance: (appearance) => set({ appearance }),
      setDeviceName: (deviceName) => set({ deviceName }),
      setChunkSize: (chunkSize) => set({ chunkSize }),
      setAutoResume: (autoResume) => set({ autoResume }),
      setConfirmIncomingTransfers: (confirmIncomingTransfers) => set({ confirmIncomingTransfers }),
      setApplicationEncryption: (applicationEncryption) => set({ applicationEncryption }),
      setSessionTimeoutSeconds: (sessionTimeoutSeconds) => set({ sessionTimeoutSeconds }),
    }),
    { name: "p2p-settings" },
  ),
);
