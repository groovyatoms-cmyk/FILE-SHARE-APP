import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface HistoryEntry {
  id: string;
  direction: "sent" | "received";
  fileName: string;
  size: number;
  timestamp: number;
  status: "completed" | "failed" | "cancelled";
  peerName: string;
  verified: boolean;
}

export interface TransferCheckpoint {
  fileId: string;
  transferId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  receivedChunks: number[];
  updatedAt: number;
}

interface ChunkRecord {
  key: string; // `${fileId}:${chunkIndex}`
  fileId: string;
  chunkIndex: number;
  data: ArrayBuffer;
}

interface P2PDbSchema extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { "by-timestamp": number };
  };
  checkpoints: {
    key: string;
    value: TransferCheckpoint;
  };
  chunks: {
    key: string;
    value: ChunkRecord;
    indexes: { "by-file": string };
  };
}

let dbPromise: Promise<IDBPDatabase<P2PDbSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<P2PDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<P2PDbSchema>("p2p-file-share", 1, {
      upgrade(db) {
        const history = db.createObjectStore("history", { keyPath: "id" });
        history.createIndex("by-timestamp", "timestamp");
        db.createObjectStore("checkpoints", { keyPath: "fileId" });
        const chunks = db.createObjectStore("chunks", { keyPath: "key" });
        chunks.createIndex("by-file", "fileId");
      },
    });
  }
  return dbPromise;
}

export const historyRepository = {
  async add(entry: HistoryEntry): Promise<void> {
    const db = await getDb();
    await db.put("history", entry);
  },
  async list(): Promise<HistoryEntry[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex("history", "by-timestamp");
    return all.reverse();
  },
  async clear(): Promise<void> {
    const db = await getDb();
    await db.clear("history");
  },
};

export const checkpointRepository = {
  async save(checkpoint: TransferCheckpoint): Promise<void> {
    const db = await getDb();
    await db.put("checkpoints", checkpoint);
  },
  async get(fileId: string): Promise<TransferCheckpoint | undefined> {
    const db = await getDb();
    return db.get("checkpoints", fileId);
  },
  async delete(fileId: string): Promise<void> {
    const db = await getDb();
    await db.delete("checkpoints", fileId);
  },
};

export const chunkRepository = {
  async put(fileId: string, chunkIndex: number, data: ArrayBuffer): Promise<void> {
    const db = await getDb();
    await db.put("chunks", { key: `${fileId}:${chunkIndex}`, fileId, chunkIndex, data });
  },
  async getAllForFile(fileId: string): Promise<ChunkRecord[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex("chunks", "by-file", fileId);
    return all.sort((a, b) => a.chunkIndex - b.chunkIndex);
  },
  async deleteAllForFile(fileId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction("chunks", "readwrite");
    let cursor = await tx.store.index("by-file").openCursor(fileId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
};

export async function clearAllTemporaryData(): Promise<void> {
  const db = await getDb();
  await db.clear("checkpoints");
  await db.clear("chunks");
}
