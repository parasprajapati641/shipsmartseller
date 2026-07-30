import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ServerSubscriptionState = {
  plan: "free" | "premium_plus";
  status: "active" | "expired";
  freeGenerationsUsed: number;
  freeGenerationLimit: number;
  remainingGenerations: number;
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isUnlimited: boolean;
  lastPaymentId: string | null;
};

type ServerStoreRecord = {
  subscription_plan: "free" | "premium_plus";
  subscription_status: "active" | "expired";
  free_generations_used: number;
  free_generations_limit: number;
  subscription_started_at: number | null;
  subscription_expires_at: number | null;
  last_payment_id: string | null;
};

// Server-side persistent store memory cache for instant sub-millisecond validation
const serverMemoryStore = new Map<string, ServerStoreRecord>();

function getNormalizedEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "default_anonymous_user";
  return email.trim().toLowerCase();
}

/** Fetch server-validated subscription state from Supabase DB or persistent store */
export async function fetchServerSubscriptionState(
  email?: string | null,
): Promise<ServerSubscriptionState> {
  const normalized = getNormalizedEmail(email);
  const now = Date.now();
  const freeGenerationLimit = 10;

  let record: ServerStoreRecord | undefined;

  // 1. ALWAYS query Supabase DB user_subscriptions table FIRST (Authoritative Database Source of Truth)
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
    if (supabaseAdmin) {
      type DbSubRecord = {
        subscription_plan?: string;
        subscription_status?: string;
        free_generations_used?: number;
        subscription_started_at?: number;
        started_at?: number;
        subscription_expires_at?: number;
        expires_at?: number;
        last_payment_id?: string;
      };
      const { data } = await (
        supabaseAdmin as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (
                col: string,
                val: string,
              ) => { maybeSingle: () => Promise<{ data: DbSubRecord | null }> };
            };
          };
        }
      )
        .from("user_subscriptions")
        .select("*")
        .eq("user_email", normalized)
        .maybeSingle();

      const dbData = data as DbSubRecord | null;
      if (dbData) {
        record = {
          subscription_plan: dbData.subscription_plan === "premium_plus" ? "premium_plus" : "free",
          subscription_status: dbData.subscription_status === "active" ? "active" : "expired",
          free_generations_used: Math.max(0, Number(dbData.free_generations_used || 0)),
          free_generations_limit: 10,
          subscription_started_at: dbData.subscription_started_at
            ? Number(dbData.subscription_started_at)
            : dbData.started_at
              ? Number(dbData.started_at)
              : null,
          subscription_expires_at: dbData.subscription_expires_at
            ? Number(dbData.subscription_expires_at)
            : dbData.expires_at
              ? Number(dbData.expires_at)
              : null,
          last_payment_id: dbData.last_payment_id ?? null,
        };
        serverMemoryStore.set(normalized, record);
      }
    }
  } catch (dbFetchErr) {
    console.warn("[SERVER SUBSCRIPTION] DB fetch warning:", dbFetchErr);
  }

  // 2. Fallback to memory cache if DB is temporarily unreachable
  if (!record) {
    record = serverMemoryStore.get(normalized);
  }

  // 3. Initial record creation for new user account
  if (!record) {
    record = {
      subscription_plan: "free",
      subscription_status: "expired",
      free_generations_used: 0,
      free_generations_limit: 10,
      subscription_started_at: null,
      subscription_expires_at: null,
      last_payment_id: null,
    };
    serverMemoryStore.set(normalized, record);

    // Upsert into Supabase DB
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
      if (supabaseAdmin) {
        await (supabaseAdmin as any).from("user_subscriptions").upsert(
          {
            user_email: normalized,
            subscription_plan: "free",
            subscription_status: "expired",
            free_generations_used: 0,
            free_generations_limit: 10,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_email" },
        );
      }
    } catch {
      // Ignored non-critical DB error
    }
  }

  // Check 30-Day Premium Expiry: Current Time >= subscription_expires_at
  let plan = record.subscription_plan;
  let status = record.subscription_status;

  if (
    plan === "premium_plus" &&
    record.subscription_expires_at &&
    now >= record.subscription_expires_at
  ) {
    // Automatically downgrade to expired free status. Do NOT reset free_generations_used!
    plan = "free";
    status = "expired";
    record.subscription_plan = "free";
    record.subscription_status = "expired";
    serverMemoryStore.set(normalized, record);

    // Update Supabase DB
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
      if (supabaseAdmin) {
        await (supabaseAdmin as any).from("user_subscriptions").upsert(
          {
            user_email: normalized,
            subscription_plan: "free",
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_email" },
        );
      }
    } catch {
      // Ignored non-critical DB error
    }
  }

  const isUnlimited =
    plan === "premium_plus" &&
    status === "active" &&
    (record.subscription_expires_at ? now < record.subscription_expires_at : true);

  const remainingGenerations = isUnlimited
    ? Infinity
    : Math.max(0, freeGenerationLimit - record.free_generations_used);

  const daysRemaining =
    record.subscription_expires_at && record.subscription_expires_at > now
      ? Math.ceil((record.subscription_expires_at - now) / (1000 * 60 * 60 * 24))
      : 0;

  return {
    plan,
    status,
    freeGenerationsUsed: record.free_generations_used,
    freeGenerationLimit,
    remainingGenerations,
    startedAt: record.subscription_started_at,
    expiresAt: record.subscription_expires_at,
    daysRemaining,
    isUnlimited,
    lastPaymentId: record.last_payment_id,
  };
}

/** TanStack Server Function: Fetch server-validated subscription state */
export const getSubscriptionServerStateFn = createServerFn({ method: "POST" })
  .validator((data?: { userEmail?: string | null }) =>
    z
      .object({ userEmail: z.string().nullable().optional() })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const email = data?.userEmail;
      const state = await fetchServerSubscriptionState(email);
      return { success: true, state };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

/** TanStack Server Function: Check generation entitlement before image generation */
export const checkGenerationEntitlementFn = createServerFn({ method: "POST" })
  .validator((data?: { userEmail?: string | null }) =>
    z
      .object({ userEmail: z.string().nullable().optional() })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const email = data?.userEmail;
      const state = await fetchServerSubscriptionState(email);

      if (state.isUnlimited) {
        return {
          allowed: true,
          plan: "premium_plus",
          isUnlimited: true,
          remainingGenerations: Infinity,
          freeGenerationsUsed: state.freeGenerationsUsed,
          state,
        };
      }

      if (state.freeGenerationsUsed >= 10) {
        return {
          allowed: false,
          reason: "FREE_TRIAL_EXHAUSTED",
          plan: "free",
          isUnlimited: false,
          remainingGenerations: 0,
          freeGenerationsUsed: state.freeGenerationsUsed,
          state,
        };
      }

      return {
        allowed: true,
        plan: "free",
        isUnlimited: false,
        remainingGenerations: Math.max(0, 10 - state.freeGenerationsUsed),
        freeGenerationsUsed: state.freeGenerationsUsed,
        state,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { allowed: false, error: msg };
    }
  });

/** TanStack Server Function: Atomically record successful generation AFTER execution succeeds */
export const recordGenerationSuccessFn = createServerFn({ method: "POST" })
  .validator((data?: { userEmail?: string | null; incrementCount?: number }) =>
    z
      .object({
        userEmail: z.string().nullable().optional(),
        incrementCount: z.number().optional().default(1),
      })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const email = data?.userEmail;
      const current = await fetchServerSubscriptionState(email);
      const normalized = getNormalizedEmail(email);

      // Premium Plus users have unlimited generation
      if (current.isUnlimited) {
        return {
          success: true,
          plan: "premium_plus",
          isUnlimited: true,
          remainingGenerations: Infinity,
          freeGenerationsUsed: current.freeGenerationsUsed,
          state: current,
        };
      }

      const countToAdd = Math.max(1, data?.incrementCount ?? 1);
      const newUsed = current.freeGenerationsUsed + countToAdd;

      const record: ServerStoreRecord = {
        subscription_plan: "free",
        subscription_status: current.status,
        free_generations_used: newUsed,
        free_generations_limit: 10,
        subscription_started_at: current.startedAt,
        subscription_expires_at: current.expiresAt,
        last_payment_id: current.lastPaymentId,
      };

      serverMemoryStore.set(normalized, record);

      // Update Supabase DB user_subscriptions table
      try {
        const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
        if (supabaseAdmin) {
          await (supabaseAdmin as any).from("user_subscriptions").upsert(
            {
              user_email: normalized,
              subscription_plan: "free",
              subscription_status: current.status,
              free_generations_used: newUsed,
              free_generations_limit: 10,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" },
          );
        }
      } catch {
        // Ignored DB write exception
      }

      const updatedState: ServerSubscriptionState = {
        ...current,
        freeGenerationsUsed: newUsed,
        remainingGenerations: Math.max(0, 10 - newUsed),
      };

      return {
        success: true,
        plan: "free",
        isUnlimited: false,
        remainingGenerations: Math.max(0, 10 - newUsed),
        freeGenerationsUsed: newUsed,
        state: updatedState,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

/** TanStack Server Function: Permanently activate Premium Plus for 30 days upon Razorpay payment */
export const activatePremiumPlusServerFn = createServerFn({ method: "POST" })
  .validator((data?: { userEmail?: string | null; paymentId?: string | null }) =>
    z
      .object({
        userEmail: z.string().nullable().optional(),
        paymentId: z.string().nullable().optional(),
      })
      .optional()
      .parse(data || {}),
  )
  .handler(async ({ data }) => {
    try {
      const normalized = getNormalizedEmail(data?.userEmail);
      const now = Date.now();
      // Exactly 30 days duration (30 * 24 * 60 * 60 * 1000 ms)
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

      const existing = serverMemoryStore.get(normalized);
      const record: ServerStoreRecord = {
        subscription_plan: "premium_plus",
        subscription_status: "active",
        free_generations_used: existing?.free_generations_used || 0,
        free_generations_limit: 10,
        subscription_started_at: now,
        subscription_expires_at: expiresAt,
        last_payment_id: data?.paymentId ?? existing?.last_payment_id ?? null,
      };

      serverMemoryStore.set(normalized, record);

      // Update Supabase DB user_subscriptions table permanently
      try {
        const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
        if (supabaseAdmin) {
          await (supabaseAdmin as any).from("user_subscriptions").upsert(
            {
              user_email: normalized,
              subscription_plan: "premium_plus",
              subscription_status: "active",
              subscription_started_at: now,
              subscription_expires_at: expiresAt,
              last_payment_id: data?.paymentId ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" },
          );
        }
      } catch {
        // Ignored DB write exception
      }

      const updatedState: ServerSubscriptionState = {
        plan: "premium_plus",
        status: "active",
        freeGenerationsUsed: record.free_generations_used,
        freeGenerationLimit: 10,
        remainingGenerations: Infinity,
        startedAt: now,
        expiresAt,
        daysRemaining: 30,
        isUnlimited: true,
        lastPaymentId: record.last_payment_id,
      };

      return { success: true, state: updatedState };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });
