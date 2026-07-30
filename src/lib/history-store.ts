// Production IndexedDB & Persistent Storage Engine for Optimization History — ShipSmart Seller

export type HistoryVariant = {
  targetKB: number;
  sizeKB: number;
  url: string;
  strategyName?: string;
};

export type HistoryEntry = {
  id: string;
  filename: string;
  category: string;
  createdAt: number;
  thumb: string; // Base64 or Blob Data URL
  originalUrl?: string;
  variants: HistoryVariant[];
};

const DB_NAME = "ShipSmartSellerDB";
const DB_VERSION = 1;
const STORE_NAME = "optimization_history";
const LOCAL_STORAGE_FALLBACK_KEY = "ship-smart:history:v2";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Asynchronously load all saved history entries sorted by newest first */
export async function loadHistoryFromStore(): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("createdAt");
      const request = index.openCursor(null, "prev"); // newest first
      const results: HistoryEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        resolve(loadLocalStorageFallback());
      };
    });
  } catch {
    return loadLocalStorageFallback();
  }
}

/** Save a new history entry permanently */
export async function saveHistoryEntryToStore(entry: HistoryEntry): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Also trim entries older than top 50 in IndexedDB
    const all = await loadHistoryFromStore();
    if (all.length > 50) {
      const toRemove = all.slice(50);
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      toRemove.forEach((item) => store.delete(item.id));
    }

    saveLocalStorageFallback(all.slice(0, 10)); // sync lightweight fallback
    return all;
  } catch {
    const fallback = [entry, ...loadLocalStorageFallback()].slice(0, 20);
    saveLocalStorageFallback(fallback);
    return fallback;
  }
}

/** Remove a single entry by ID */
export async function removeHistoryEntryFromStore(id: string): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }

  const updated = (await loadHistoryFromStore()).filter((item) => item.id !== id);
  saveLocalStorageFallback(updated.slice(0, 10));
  return updated;
}

/** Clear all history */
export async function clearHistoryFromStore(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }
  localStorage.removeItem(LOCAL_STORAGE_FALLBACK_KEY);
}

function loadLocalStorageFallback(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageFallback(entries: HistoryEntry[]) {
  try {
    // Save lightweight versions without heavy originalUrl
    const lightweight = entries.map((e) => ({
      id: e.id,
      filename: e.filename,
      category: e.category,
      createdAt: e.createdAt,
      thumb: e.thumb.length > 50000 ? "" : e.thumb,
      variants: e.variants.map((v) => ({
        targetKB: v.targetKB,
        sizeKB: v.sizeKB,
        strategyName: v.strategyName,
        url: v.url.length > 100000 ? "" : v.url,
      })),
    }));
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(lightweight));
  } catch {
    // Quota catch
  }
}
