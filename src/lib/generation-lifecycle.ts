// Centralized Generation Lifecycle Pipeline — ShipSmart Seller
// Single Source of Truth for Credit Decrements, Isolated History Persistence, and Debug Logging.

import { checkGenerationEntitlementFn, recordGenerationSuccessFn } from "./subscription-server-actions.js";
import { incrementFreeGenerations, loadSubscriptionState, type UserSubscriptionState } from "./subscription-store.js";
import { saveHistoryEntryToStore, type HistoryEntry, type HistoryVariant } from "./history-store.js";

export type CentralizedGenerationPayload = {
  userEmail?: string | null;
  generationType: "KB Generator" | "AI Auto Pilot" | "One Click Studio" | string;
  filename: string;
  category: string;
  thumb: string;
  originalUrl?: string;
  variants: HistoryVariant[];
  targetKB?: number;
};

export type CentralizedGenerationResult = {
  success: boolean;
  historyEntry?: HistoryEntry;
  subState?: UserSubscriptionState;
  error?: string;
};

/**
 * Single centralized function to handle successful generation completion.
 * 1. Calculates credit before & after.
 * 2. Decrements credit strictly by ONE on server/store for free users.
 * 3. Persists user-isolated history entry to IndexedDB.
 * 4. Logs structured QA verification diagnostics to console.
 */
export async function executeGenerationCompletion(
  payload: CentralizedGenerationPayload,
): Promise<CentralizedGenerationResult> {
  const normEmail = payload.userEmail ? payload.userEmail.trim().toLowerCase() : "anonymous";

  // 1. Get Subscription Credit State Before
  const subStateBefore = loadSubscriptionState(normEmail);
  const creditBefore = subStateBefore.remainingGenerations;

  // 2. Server/Store Credit Decrement strictly after success
  let subStateAfter = subStateBefore;
  if (!subStateBefore.isUnlimited) {
    try {
      const recRes = await recordGenerationSuccessFn({ data: { userEmail: normEmail } });
      if (recRes.state) {
        subStateAfter = recRes.state as UserSubscriptionState;
      }
    } catch (err) {
      console.warn("[LIFECYCLE] Server credit decrement fallback to client store:", err);
      subStateAfter = incrementFreeGenerations(normEmail);
    }
  }

  // 3. Construct Unified User-Isolated History Entry
  const historyEntry: HistoryEntry = {
    id: crypto.randomUUID(),
    filename: payload.filename,
    category: payload.category,
    createdAt: Date.now(),
    thumb: payload.thumb,
    originalUrl: payload.originalUrl,
    variants: payload.variants,
    userEmail: normEmail,
    generationType: payload.generationType,
  };

  let historySaved = false;
  try {
    await saveHistoryEntryToStore(historyEntry, normEmail);
    historySaved = true;
  } catch (histErr) {
    console.error("[LIFECYCLE ERROR] Failed to save history entry:", histErr);
  }

  const finalKB = payload.variants[0]?.sizeKB ?? payload.targetKB ?? 0;

  // 4. Structured Debug QA Log Output
  console.log(`
----------------------------------
Generation Success
User:
${normEmail}
Type:
${payload.generationType}
Credit Before:
${subStateBefore.isUnlimited ? "Unlimited (Premium)" : creditBefore}
Credit After:
${subStateAfter.isUnlimited ? "Unlimited (Premium)" : subStateAfter.remainingGenerations}
History Saved:
${historySaved ? "YES" : "NO"}
History ID:
${historyEntry.id}
Final KB:
${finalKB} KB
----------------------------------
  `);

  return {
    success: true,
    historyEntry,
    subState: subStateAfter,
  };
}

export const handleGenerationSuccess = executeGenerationCompletion;
