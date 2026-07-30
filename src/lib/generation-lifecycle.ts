// Centralized Generation Lifecycle Pipeline — ShipSmart Seller
// Single Source of Truth: Centralized function `recordSuccessfulGeneration()`
// Enforces Atomic Credit Decrement in Supabase DB, Uploads Permanent Storage URLs, and Persists Database History.

import {
  checkGenerationEntitlementFn,
  recordGenerationSuccessFn,
} from "./subscription-server-actions.js";
import { loadSubscriptionState, type UserSubscriptionState } from "./subscription-store.js";
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
 * Execution Steps:
 *  1. Uploads original image, thumbnail, and generated variants to Supabase Storage (permanent CDN URLs).
 *  2. Persists history entry directly into Supabase Database `optimization_history` table.
 *  3. Executes atomic credit decrement in Supabase Database `user_subscriptions` table.
 *  4. Returns updated subscription state & history entry for immediate UI refresh.
 */
export async function recordSuccessfulGeneration(
  payload: CentralizedGenerationPayload,
): Promise<CentralizedGenerationResult> {
  const normEmail = payload.userEmail ? payload.userEmail.trim().toLowerCase() : "anonymous";

  try {
    // Step 1. Entitlement Check from Supabase DB
    const subStateBefore = loadSubscriptionState(normEmail);
    if (!subStateBefore.isUnlimited && subStateBefore.remainingGenerations <= 0) {
      return {
        success: false,
        error: "Free generation limit reached. Please upgrade to Premium.",
      };
    }

    // Step 2. Upload Thumbnails and Variant Blobs to Supabase Storage (Permanent URLs)
    const permanentThumbUrl = await uploadImageToSupabaseStorage(payload.thumb, normEmail, "thumb");

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

    // Step 3. Save History Entry to Supabase Database `optimization_history`
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

    await saveHistoryEntryToStore(historyEntry, normEmail);

    // Step 4. Execute Atomic Credit Decrement in Supabase Database `user_subscriptions`
    let subStateAfter = subStateBefore;
    if (!subStateBefore.isUnlimited) {
      const serverRes = await recordGenerationSuccessFn({ data: { userEmail: normEmail } });
      if (serverRes.state) {
        subStateAfter = serverRes.state as UserSubscriptionState;
      }
    }

    console.log(`
====================================================
[SUCCESSFUL GENERATION RECORDED]
User Email:      ${normEmail}
Generator Type:  ${payload.generationType}
History ID:      ${historyEntry.id}
Permanent Thumb: ${permanentThumbUrl.substring(0, 60)}...
Credits Before:  ${subStateBefore.isUnlimited ? "Unlimited" : subStateBefore.remainingGenerations}
Credits After:   ${subStateAfter.isUnlimited ? "Unlimited" : subStateAfter.remainingGenerations}
====================================================
    `);

    return {
      success: true,
      historyEntry,
      subState: subStateAfter,
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
