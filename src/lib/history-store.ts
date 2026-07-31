// Production Database-Backed Storage Engine for Optimization History — ShipSmart Seller
// Single Source of Truth: Supabase Database `optimization_history` table.
// Stores permanent image URLs (never temporary Blob URLs). Ground truth persists across refreshes, logouts, logins, and devices.

import { supabase } from "@/integrations/supabase/client";
import { getOrCreateGuestId } from "./guest-store";

export type HistoryVariant = {
  targetKB: number;
  sizeKB: number;
  url: string;
  strategyName?: string;
  aspectRatio?: string;
  marketplace?: string;
  dimensions?: { width: number; height: number };
};

export type HistoryEntry = {
  id: string;
  filename: string;
  category: string;
  createdAt: number;
  thumb: string; // Permanent Public URL or permanent Base64 Data URL
  originalUrl?: string;
  variants: HistoryVariant[];
  userEmail?: string;
  generationType?: "KB Presets" | "AI Auto Pilot" | "One Click Studio" | string;
};

const DB_NAME = "ShipSmartSellerDB";
const DB_VERSION = 2;
const STORE_NAME = "optimization_history";

function resolveIdentity(userEmail?: string | null): string {
  if (userEmail && userEmail.trim().length > 0) {
    return userEmail.trim().toLowerCase();
  }
  return getOrCreateGuestId();
}

function getSupabaseClient() {
  return supabase as unknown as {
    from: (table: string) => {
      select: (cols?: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (
            col: string,
            opts?: { ascending?: boolean },
          ) => Promise<{
            data: Record<string, unknown>[] | null;
            error: { message: string } | null;
          }>;
        };
      };
      upsert: (
        record: Record<string, unknown>,
        opts?: { onConflict?: string },
      ) => Promise<{ error: { message: string } | null }>;
      delete: () => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (col2: string, val2: string) => Promise<{ error: { message: string } | null }>;
        } & Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

function openIndexedDB(): Promise<IDBDatabase> {
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

function getFallbackKey(userEmail?: string | null): string {
  const norm = resolveIdentity(userEmail);
  return `ship-smart:history:v2_${norm}`;
}

/**
 * Loads history entries from Supabase Database `optimization_history` table (WHERE user_email = current_user).
 * Fallback to IndexedDB/localStorage if Supabase table is unreachable or uninitialized.
 */
export async function loadHistoryFromStore(userEmail?: string | null): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];
  const normEmail = resolveIdentity(userEmail);

  // 1. Primary Source of Truth: Supabase Database `optimization_history`
  try {
    const dbClient = getSupabaseClient();
    const { data, error } = await dbClient
      .from("optimization_history")
      .select("*")
      .eq("user_email", normEmail)
      .order("created_at", { ascending: false });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const dbEntries: HistoryEntry[] = data.map((row: Record<string, unknown>) => ({
        id: String(row.id || crypto.randomUUID()),
        filename: String(row.filename || "Untitled Image"),
        category: String(row.category || "apparel"),
        createdAt: Number(row.created_at || Date.now()),
        thumb: String(row.thumb_url || row.thumb || ""),
        originalUrl: row.original_url ? String(row.original_url) : undefined,
        variants: Array.isArray(row.variants) ? (row.variants as HistoryVariant[]) : [],
        userEmail: String(row.user_email || normEmail),
        generationType: String(row.generation_type || "KB Presets"),
      }));

      // Cache locally
      saveIndexedDBFallback(dbEntries, normEmail);
      return dbEntries;
    }
  } catch (dbErr) {
    console.warn("[HISTORY STORE] Supabase DB fetch warning:", dbErr);
  }

  // 2. Fallback: IndexedDB / Local Storage Cache
  return loadIndexedDBFallback(normEmail);
}

/**
 * Saves a new history entry into Supabase Database `optimization_history` table.
 */
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

  // 1. Primary Action: Insert into Supabase Database `optimization_history`
  try {
    const dbClient = getSupabaseClient();
    const { error: dbErr } = await dbClient.from("optimization_history").upsert(
      {
        id: entryWithUser.id,
        user_email: normEmail,
        filename: entryWithUser.filename,
        category: entryWithUser.category,
        generation_type: entryWithUser.generationType ?? "KB Presets",
        created_at: entryWithUser.createdAt,
        thumb_url: entryWithUser.thumb,
        original_url: entryWithUser.originalUrl ?? null,
        variants: entryWithUser.variants,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (dbErr) {
      console.warn("[HISTORY STORE] Supabase DB upsert warning:", dbErr.message);
    }
  } catch (err) {
    console.warn("[HISTORY STORE] Supabase DB exception:", err);
  }

  // 2. Save to local IndexedDB/localStorage cache
  await saveSingleIndexedDBEntry(entryWithUser);
  const userHistory = await loadHistoryFromStore(normEmail);
  return userHistory;
}

/** Removes a single entry by ID from Supabase DB and local cache */
export async function removeHistoryEntryFromStore(
  id: string,
  userEmail?: string | null,
): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];
  const normEmail = resolveIdentity(userEmail);

  try {
    const dbClient = getSupabaseClient();
    await dbClient.from("optimization_history").delete().eq("id", id).eq("user_email", normEmail);
  } catch (dbErr) {
    console.warn("[HISTORY STORE] Supabase DB delete warning:", dbErr);
  }

  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
  } catch {
    // ignore
  }

  const updated = (await loadHistoryFromStore(normEmail)).filter((item) => item.id !== id);
  return updated;
}

/** Clears all history for specific user/guest from Supabase DB and local cache */
export async function clearHistoryFromStore(userEmail?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const normEmail = resolveIdentity(userEmail);

  try {
    const dbClient = getSupabaseClient();
    await dbClient.from("optimization_history").delete().eq("user_email", normEmail);
  } catch (dbErr) {
    console.warn("[HISTORY STORE] Supabase DB clear warning:", dbErr);
  }

  try {
    const userEntries = await loadIndexedDBFallback(normEmail);
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    userEntries.forEach((e) => store.delete(e.id));
  } catch {
    // ignore
  }
  localStorage.removeItem(getFallbackKey(normEmail));
}

// Internal Local Storage / IndexedDB Cache Fallbacks
async function loadIndexedDBFallback(normEmail: string): Promise<HistoryEntry[]> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("createdAt");
      const request = index.openCursor(null, "prev");
      const results: HistoryEntry[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const val: HistoryEntry = cursor.value;
          if (!val.userEmail || val.userEmail.trim().toLowerCase() === normEmail) {
            results.push(val);
          }
          cursor.continue();
        } else {
          resolve(results.length > 0 ? results : loadLocalStorageFallback(normEmail));
        }
      };

      request.onerror = () => resolve(loadLocalStorageFallback(normEmail));
    });
  } catch {
    return loadLocalStorageFallback(normEmail);
  }
}

async function saveIndexedDBFallback(entries: HistoryEntry[], normEmail: string) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    entries.forEach((e) => store.put(e));
  } catch {
    saveLocalStorageFallback(entries.slice(0, 10), normEmail);
  }
}

async function saveSingleIndexedDBEntry(entry: HistoryEntry) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
  } catch {
    // ignore
  }
}

function loadLocalStorageFallback(normEmail: string): HistoryEntry[] {
  try {
    const key = getFallbackKey(normEmail);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageFallback(entries: HistoryEntry[], normEmail: string) {
  try {
    const key = getFallbackKey(normEmail);
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    // Quota catch
  }
}
