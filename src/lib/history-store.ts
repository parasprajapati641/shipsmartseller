// Production IndexedDB & User-Isolated Storage Engine for Optimization History — ShipSmart Seller

import { getOrCreateGuestId } from "./guest-store";

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
  userEmail?: string;
  generationType?: "KB Generator" | "AI Auto Pilot" | "One Click Studio" | string;
};

const DB_NAME = "ShipSmartSellerDB";
const DB_VERSION = 2;
const STORE_NAME = "optimization_history";

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
        store.createIndex("userEmail", "userEmail", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function resolveIdentity(userEmail?: string | null): string {
  if (userEmail && userEmail.trim().length > 0) {
    return userEmail.trim().toLowerCase();
  }
  return getOrCreateGuestId();
}

function getFallbackKey(userEmail?: string | null): string {
  const norm = resolveIdentity(userEmail);
  return `ship-smart:history:v2_${norm}`;
}

/** Asynchronously load saved history entries isolated by user account or guest ID, newest first */
export async function loadHistoryFromStore(userEmail?: string | null): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];
  const normEmail = resolveIdentity(userEmail);

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
          const val: HistoryEntry = cursor.value;
          // User/Guest Isolation: match exact identity or fallback
          if (!val.userEmail || val.userEmail.trim().toLowerCase() === normEmail) {
            results.push(val);
          }
          cursor.continue();
        } else {
          resolve(results.length > 0 ? results : loadLocalStorageFallback(normEmail));
        }
      };

      request.onerror = () => {
        resolve(loadLocalStorageFallback(normEmail));
      };
    });
  } catch {
    return loadLocalStorageFallback(normEmail);
  }
}

/** Save a new history entry isolated by user email or guest ID */
export async function saveHistoryEntryToStore(
  entry: HistoryEntry,
  userEmail?: string | null,
): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  const normEmail = resolveIdentity(userEmail || entry.userEmail);
  const entryWithUser: HistoryEntry = {
    ...entry,
    userEmail: normEmail,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entryWithUser);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    const userHistory = await loadHistoryFromStore(normEmail);
    saveLocalStorageFallback(userHistory.slice(0, 10), normEmail);
    return userHistory;
  } catch {
    const current = loadLocalStorageFallback(normEmail);
    const fallback = [entryWithUser, ...current].slice(0, 20);
    saveLocalStorageFallback(fallback, normEmail);
    return fallback;
  }
}

/** Remove a single entry by ID */
export async function removeHistoryEntryFromStore(
  id: string,
  userEmail?: string | null,
): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];
  const normEmail = resolveIdentity(userEmail);

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

  const updated = (await loadHistoryFromStore(normEmail)).filter((item) => item.id !== id);
  saveLocalStorageFallback(updated.slice(0, 10), normEmail);
  return updated;
}

/** Clear history for specific user or guest */
export async function clearHistoryFromStore(userEmail?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const normEmail = resolveIdentity(userEmail);

  try {
    const db = await openDB();
    const userEntries = await loadHistoryFromStore(normEmail);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      userEntries.forEach((e) => store.delete(e.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  localStorage.removeItem(getFallbackKey(normEmail));
}

function loadLocalStorageFallback(userEmail?: string | null): HistoryEntry[] {
  try {
    const key = getFallbackKey(userEmail);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageFallback(entries: HistoryEntry[], userEmail?: string | null) {
  try {
    const key = getFallbackKey(userEmail);
    const lightweight = entries.map((e) => ({
      id: e.id,
      filename: e.filename,
      category: e.category,
      createdAt: e.createdAt,
      thumb: e.thumb.length > 50000 ? "" : e.thumb,
      userEmail: e.userEmail,
      generationType: e.generationType,
      variants: e.variants.map((v) => ({
        targetKB: v.targetKB,
        sizeKB: v.sizeKB,
        strategyName: v.strategyName,
        url: v.url.length > 100000 ? "" : v.url,
      })),
    }));
    localStorage.setItem(key, JSON.stringify(lightweight));
  } catch {
    // Quota catch
  }
}
