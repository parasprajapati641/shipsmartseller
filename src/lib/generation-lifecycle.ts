// Centralized Generation Lifecycle Pipeline — ShipSmart Seller (Premium-Only Model)
// Single Source of Truth: Centralized function `recordSuccessfulGeneration()`
// Validates Premium Subscription, Uploads Permanent Storage URLs, and Persists MongoDB Database History.

import {
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
 *  1. Premium Entitlement check from Database / Store.
 *  2. Upload original image, thumbnail, and variants to Storage.
 *  3. Insert history entry directly into MongoDB Database via `saveHistoryEntryToStore`.
 *  4. Return refreshed state & history list for immediate UI sync.
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
    // Step 1. Check Premium Subscription State
    const subStateBefore = await fetchSubscriptionStateFromDatabase(normEmail);

    if (!subStateBefore.isUnlimited) {
      console.warn(`[GENERATION PIPELINE BLOCKED] Premium plan required for ${normEmail}`);
      return {
        success: false,
        error: "Premium subscription required. Please upgrade to Premium plan (₹999/month).",
      };
    }

    // Step 2. Upload Thumbnails and Variant Blobs to Storage (Permanent URLs)
    console.log(`[GENERATION PIPELINE] Uploading thumbnail to Storage...`);
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

    // Step 3. Create & Insert History Row into MongoDB Database
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
      `[GENERATION PIPELINE] Inserting history row ${historyEntry.id} into MongoDB...`,
    );
    const updatedHistoryList = await saveHistoryEntryToStore(historyEntry, normEmail);
    console.log(
      `[GENERATION PIPELINE] History insert successful. Total user history rows: ${updatedHistoryList.length}`,
    );

    return {
      success: true,
      historyEntry,
      subState: subStateBefore,
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
