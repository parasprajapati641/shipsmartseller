// Centralized Generation Lifecycle Pipeline — ShipSmart Seller
// Single Source of Truth: Centralized function `recordSuccessfulGeneration()`
// Enforces Atomic Credit Decrement in Supabase DB, Uploads Permanent Storage URLs, and Persists Database History.

import {
  checkGenerationEntitlementFn,
  recordGenerationSuccessFn,
} from "./subscription-server-actions.js";
import {
  loadSubscriptionState,
  fetchSubscriptionStateFromDatabase,
  type UserSubscriptionState,
} from "./subscription-store.js";
import {
  saveHistoryEntryToStore,
  type HistoryEntry,
  type HistoryVariant,
} from "./history-store.js";
import { uploadImageToSupabaseStorage } from "./supabase-storage.js";

export type CentralizedGenerationPayload = {
  userEmail?: string | null;
  generationType: "KB Presets" | "AI Auto Pilot" | "One Click Studio" | string;
  filename: string;
  category: string;
  thumb: string | Blob;
  originalUrl?: string | Blob;
  variants: Array<{
    targetKB: number;
    sizeKB: number;
    url: string | Blob;
    strategyName?: string;
    aspectRatio?: string;
    marketplace?: string;
    dimensions?: { width: number; height: number };
  }>;
  targetKB?: number;
};

export type CentralizedGenerationResult = {
  success: boolean;
  historyEntry?: HistoryEntry;
  subState?: UserSubscriptionState;
  error?: string;
};

/**
 * Unified Centralized Function: `recordSuccessfulGeneration()`
 *
 * Called ONLY AFTER a successful image generation across all 3 modules:
 * 1. Autonomous AI Auto Pilot
 * 2. 5KB–50KB Presets Generator
 * 3. One Click Content Studio
 *
 * Order of Operations (Atomic Flow):
 *  1. Entitlement check directly from Supabase Database.
 *  2. Upload original image, thumbnail, and variants to Supabase Storage (permanent CDN URLs).
 *  3. Insert history entry directly into Supabase Database `optimization_history` table.
 *  4. Execute atomic credit decrement in Supabase Database `user_subscriptions` table.
 *  5. Re-fetch refreshed credit state & history list for immediate UI sync.
 */
export async function recordSuccessfulGeneration(
  payload: CentralizedGenerationPayload,
): Promise<CentralizedGenerationResult> {
  const normEmail = payload.userEmail ? payload.userEmail.trim().toLowerCase() : "anonymous";

  console.log(`
====================================================
[GENERATION PIPELINE INITIATED]
User Email:      ${normEmail}
Generator Type:  ${payload.generationType}
Filename:        ${payload.filename}
Category:        ${payload.category}
Variants Count:  ${payload.variants.length}
====================================================
  `);

  try {
    // Step 1. Fetch Ground Truth Subscription State & Entitlement Check from Supabase DB
    const subStateBefore = await fetchSubscriptionStateFromDatabase(normEmail);
    console.log(
      `[GENERATION PIPELINE] Credits Before Update for ${normEmail}: ${subStateBefore.isUnlimited ? "Unlimited" : subStateBefore.remainingGenerations}`,
    );

    if (!subStateBefore.isUnlimited && subStateBefore.remainingGenerations <= 0) {
      console.warn(`[GENERATION PIPELINE BLOCKED] 0 credits remaining for ${normEmail}`);
      return {
        success: false,
        error: "Free generation limit reached. Please upgrade to Premium.",
      };
    }

    // Step 2. Upload Thumbnails and Variant Blobs to Supabase Storage (Permanent URLs)
    console.log(`[GENERATION PIPELINE] Uploading thumbnail to Supabase Storage...`);
    const permanentThumbUrl = await uploadImageToSupabaseStorage(payload.thumb, normEmail, "thumb");
    console.log(
      `[GENERATION PIPELINE] Thumbnail Upload Success: ${permanentThumbUrl.substring(0, 60)}...`,
    );

    const permanentOriginalUrl = payload.originalUrl
      ? await uploadImageToSupabaseStorage(payload.originalUrl, normEmail, "original")
      : permanentThumbUrl;

    const permanentVariants: HistoryVariant[] = await Promise.all(
      payload.variants.map(async (v, index) => {
        const permanentUrl = await uploadImageToSupabaseStorage(
          v.url,
          normEmail,
          `variant_${v.targetKB}kb_${index}`,
        );
        return {
          targetKB: v.targetKB,
          sizeKB: v.sizeKB,
          url: permanentUrl,
          strategyName: v.strategyName ?? `${v.targetKB}KB Strategy`,
          aspectRatio: v.aspectRatio ?? "1:1 Square",
          marketplace: v.marketplace ?? "Meesho / Flipkart / Amazon",
          dimensions: v.dimensions ?? { width: 1080, height: 1080 },
        };
      }),
    );

    // Step 3. Create & Insert History Row into Supabase Database `optimization_history`
    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      filename: payload.filename,
      category: payload.category,
      createdAt: Date.now(),
      thumb: permanentThumbUrl,
      originalUrl: permanentOriginalUrl,
      variants: permanentVariants,
      userEmail: normEmail,
      generationType: payload.generationType,
    };

    console.log(
      `[GENERATION PIPELINE] Inserting history row ${historyEntry.id} into Supabase DB optimization_history...`,
    );
    const updatedHistoryList = await saveHistoryEntryToStore(historyEntry, normEmail);
    console.log(
      `[GENERATION PIPELINE] History insert successful. Total user history rows: ${updatedHistoryList.length}`,
    );

    // Step 4. Execute Atomic Credit Decrement in Supabase Database `user_subscriptions`
    let subStateAfter = subStateBefore;
    if (!subStateBefore.isUnlimited) {
      console.log(
        `[GENERATION PIPELINE] Decrementing credit count in Supabase DB for ${normEmail}...`,
      );
      const serverRes = await recordGenerationSuccessFn({ data: { userEmail: normEmail } });
      if (serverRes.state) {
        subStateAfter = serverRes.state as UserSubscriptionState;
        console.log(
          `[GENERATION PIPELINE] Credit Decrement Success! Remaining credits now: ${subStateAfter.remainingGenerations}`,
        );
      } else {
        console.warn(`[GENERATION PIPELINE] Credit decrement returned warning:`, serverRes.error);
      }
    }

    // Step 5. Re-query Ground Truth from Supabase DB to ensure UI is 100% synced
    const refreshedDbState = await fetchSubscriptionStateFromDatabase(normEmail);

    console.log(`
====================================================
[SUCCESSFUL GENERATION RECORDED]
User Email:      ${normEmail}
Generator Type:  ${payload.generationType}
History ID:      ${historyEntry.id}
Permanent Thumb: ${permanentThumbUrl.substring(0, 60)}...
Credits Before:  ${subStateBefore.isUnlimited ? "Unlimited" : subStateBefore.remainingGenerations}
Credits After:   ${refreshedDbState.isUnlimited ? "Unlimited" : refreshedDbState.remainingGenerations}
====================================================
    `);

    return {
      success: true,
      historyEntry,
      subState: refreshedDbState,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[RECORD GENERATION ERROR] Generation pipeline failed:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

// Aliases for backwards compatibility across existing components
export const handleGenerationCompleted = recordSuccessfulGeneration;
export const executeGenerationCompletion = recordSuccessfulGeneration;
export const handleGenerationSuccess = recordSuccessfulGeneration;
