// Guest User & Persistence Engine — ShipSmart Seller
// Generates and securely persists a unique Guest ID across localStorage, cookies, and IndexedDB.

const GUEST_ID_KEY = "shipsmart_guest_id_v1";

/**
 * Retrieves the existing Guest ID or creates a new one securely.
 * Persists in both localStorage and document.cookie so it survives refreshes, browser restarts, and tab resets.
 */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "guest_ssr_fallback";
  }

  try {
    // 1. Try reading from localStorage
    const localId = localStorage.getItem(GUEST_ID_KEY);
    if (localId && localId.startsWith("guest_")) {
      ensureCookieSet(localId);
      return localId;
    }

    // 2. Try reading from cookies
    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${GUEST_ID_KEY}=([^;]*)`));
    if (cookieMatch && cookieMatch[1] && cookieMatch[1].startsWith("guest_")) {
      const cookieId = cookieMatch[1];
      localStorage.setItem(GUEST_ID_KEY, cookieId);
      return cookieId;
    }

    // 3. Generate new unique Guest ID
    const randomSeed = Math.random().toString(36).substring(2, 10);
    const timestamp = Date.now().toString(36);
    const newGuestId = `guest_${timestamp}_${randomSeed}`;

    localStorage.setItem(GUEST_ID_KEY, newGuestId);
    ensureCookieSet(newGuestId);
    return newGuestId;
  } catch {
    return "guest_session_fallback";
  }
}

function ensureCookieSet(guestId: string) {
  try {
    const oneYearSeconds = 365 * 24 * 60 * 60;
    document.cookie = `${GUEST_ID_KEY}=${guestId}; path=/; max-age=${oneYearSeconds}; SameSite=Lax`;
  } catch {
    // Cookie write fallback
  }
}

/**
 * Migrates guest history entries to a newly authenticated User Email.
 */
export async function migrateGuestDataToUser(
  userEmail: string,
): Promise<{ migratedHistoryCount: number }> {
  if (typeof window === "undefined" || !userEmail) {
    return { migratedHistoryCount: 0 };
  }

  const guestId = getOrCreateGuestId();
  const normalizedEmail = userEmail.trim().toLowerCase();

  let migratedHistoryCount = 0;

  try {
    const { loadHistoryFromStore, saveHistoryEntryToStore } = await import("./history-store");

    // Migrate Guest History
    const guestHistory = await loadHistoryFromStore(guestId);
    if (guestHistory.length > 0) {
      for (const entry of guestHistory) {
        await saveHistoryEntryToStore({ ...entry, userEmail: normalizedEmail }, normalizedEmail);
        migratedHistoryCount++;
      }
    }
  } catch (err) {
    console.error("[Guest Migration] Error migrating guest data:", err);
  }

  return { migratedHistoryCount };
}
