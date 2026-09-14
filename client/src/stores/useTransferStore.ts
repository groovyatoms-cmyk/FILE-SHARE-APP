import { create } from "zustand";
import type { PerFileStatus, TransferState } from "@p2p/shared";

export interface TransferFileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  status: PerFileStatus;
  bytesTransferred: number;
  currentSpeedBps: number;
  averageSpeedBps: number;
  etaSeconds: number;
  checksumVerified?: boolean;
  error?: string;
}

interface TransferStoreState {
  transferState: TransferState;
  direction: "send" | "receive" | null;
  peerDisplayName: string | null;
  files: Record<string, TransferFileEntry>;
  fileOrder: string[];
  overallSpeedBps: number;
  overallEtaSeconds: number;

  setTransferState: (state: TransferState) => void;
  setDirection: (direction: "send" | "receive" | null) => void;
  setPeerDisplayName: (name: string | null) => void;
  initFiles: (files: { id: string; name: string; size: number; type: string }[]) => void;
  updateFileProgress: (
    id: string,
    patch: Partial<Pick<TransferFileEntry, "bytesTransferred" | "currentSpeedBps" | "averageSpeedBps" | "etaSeconds">>,
  ) => void;
  setFileStatus: (id: string, status: PerFileStatus, extra?: Partial<TransferFileEntry>) => void;
  setOverallSpeed: (speedBps: number, etaSeconds: number) => void;
  reset: () => void;
}

const initial = {
  transferState: "IDLE" as TransferState,
  direction: null as "send" | "receive" | null,
  peerDisplayName: null as string | null,
  files: {} as Record<string, TransferFileEntry>,
  fileOrder: [] as string[],
  overallSpeedBps: 0,
  overallEtaSeconds: Infinity,
};

export const useTransferStore = create<TransferStoreState>((set) => ({
  ...initial,
  setTransferState: (transferState) => set({ transferState }),
  setDirection: (direction) => set({ direction }),
  setPeerDisplayName: (peerDisplayName) => set({ peerDisplayName }),
  initFiles: (files) =>
    set({
      files: Object.fromEntries(
        files.map((f) => [
          f.id,
          {
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
            status: "QUEUED" as PerFileStatus,
            bytesTransferred: 0,
            currentSpeedBps: 0,
            averageSpeedBps: 0,
            etaSeconds: Infinity,
          },
        ]),
      ),
      fileOrder: files.map((f) => f.id),
    }),
  updateFileProgress: (id, patch) =>
    set((state) => {
      const existing = state.files[id];
      if (!existing) return state;
      return { files: { ...state.files, [id]: { ...existing, ...patch } } };
    }),
  setFileStatus: (id, status, extra) =>
    set((state) => {
      const existing = state.files[id];
      if (!existing) return state;
      return { files: { ...state.files, [id]: { ...existing, status, ...extra } } };
    }),
  setOverallSpeed: (overallSpeedBps, overallEtaSeconds) => set({ overallSpeedBps, overallEtaSeconds }),
  reset: () => set({ ...initial, files: {}, fileOrder: [] }),
}));
