import { create } from "zustand";
import { historyRepository, type HistoryEntry } from "../services/storage/db";

interface HistoryStoreState {
  entries: HistoryEntry[];
  loaded: boolean;
  refresh: () => Promise<void>;
  add: (entry: HistoryEntry) => Promise<void>;
  clear: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStoreState>((set) => ({
  entries: [],
  loaded: false,
  refresh: async () => {
    const entries = await historyRepository.list();
    set({ entries, loaded: true });
  },
  add: async (entry) => {
    await historyRepository.add(entry);
    set((state) => ({ entries: [entry, ...state.entries] }));
  },
  clear: async () => {
    await historyRepository.clear();
    set({ entries: [] });
  },
}));
