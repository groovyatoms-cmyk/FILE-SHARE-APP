import { create } from "zustand";

export interface QueuedFile {
  id: string;
  file: File;
  relativePath?: string;
}

interface SessionStoreState {
  queuedFiles: QueuedFile[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  clear: () => void;
  totalBytes: () => number;
}

function makeId(): string {
  return crypto.randomUUID();
}

export const useSessionStore = create<SessionStoreState>((set, get) => ({
  queuedFiles: [],
  addFiles: (files) =>
    set((state) => {
      const existingKeys = new Set(state.queuedFiles.map((q) => `${q.file.name}:${q.file.size}:${q.file.lastModified}`));
      const additions = files
        .filter((f) => !existingKeys.has(`${f.name}:${f.size}:${f.lastModified}`))
        .map((file) => ({ id: makeId(), file }));
      return { queuedFiles: [...state.queuedFiles, ...additions] };
    }),
  removeFile: (id) => set((state) => ({ queuedFiles: state.queuedFiles.filter((q) => q.id !== id) })),
  reorder: (fromIndex, toIndex) =>
    set((state) => {
      const next = [...state.queuedFiles];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return state;
      next.splice(toIndex, 0, moved);
      return { queuedFiles: next };
    }),
  clear: () => set({ queuedFiles: [] }),
  totalBytes: () => get().queuedFiles.reduce((sum, q) => sum + q.file.size, 0),
}));
