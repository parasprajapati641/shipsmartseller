import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ServerSubscriptionState = {
  plan: "premium_plus" | "unsubscribed";
  status: "active" | "expired";
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isUnlimited: boolean;
  lastPaymentId: string | null;
};

type ServerStoreRecord = {
  subscription_plan: "premium_plus" | "unsubscribed";
  subscription_status: "active" | "expired";
  subscription_started_at: number | null;
  subscription_expires_at: number | null;
  last_payment_id: string | null;
};

// Server-side persistent store memory cache
const serverMemoryStore = new Map<string, ServerStoreRecord>();

function getNormalizedEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "default_anonymous_user";
  return email.trim().toLowerCase();
}

/** Fetch server-validated subscription state */
export async function fetchServerSubscriptionState(
  email?: string | null,
): Promise<ServerSubscriptionState> {
  const normalized = getNormalizedEmail(email);
  const now = Date.now();

  let record: ServerStoreRecord | undefined;

  // 1. Check Supabase DB user_subscriptions
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
    if (supabaseAdmin) {
      type DbSubRecord = {
        subscription_plan?: string;
        subscription_status?: string;
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
          subscription_plan: dbData.subscription_plan === "premium_plus" ? "premium_plus" : "unsubscribed",
          subscription_status: dbData.subscription_status === "active" ? "active" : "expired",
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

  // 2. Fallback to memory cache
  if (!record) {
    record = serverMemoryStore.get(normalized);
  }

  if (!record) {
    record = {
      subscription_plan: "unsubscribed",
      subscription_status: "expired",
      subscription_started_at: null,
      subscription_expires_at: null,
      last_payment_id: null,
    };
    serverMemoryStore.set(normalized, record);
  }

  // Check 30-Day Premium Expiry: Current Time >= subscription_expires_at
  let plan = record.subscription_plan;
  let status = record.subscription_status;

  if (
    plan === "premium_plus" &&
    record.subscription_expires_at &&
    now >= record.subscription_expires_at
  ) {
    plan = "unsubscribed";
    status = "expired";
    record.subscription_plan = "unsubscribed";
    record.subscription_status = "expired";
    serverMemoryStore.set(normalized, record);

    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
      if (supabaseAdmin) {
        await (
          supabaseAdmin as unknown as {
            from: (t: string) => { upsert: (d: unknown, o?: unknown) => Promise<unknown> };
          }
        )
          .from("user_subscriptions")
          .upsert(
            {
              user_email: normalized,
              subscription_plan: "unsubscribed",
              subscription_status: "expired",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" },
          );
      }
    } catch {
      // Ignored
    }
  }

  const isUnlimited =
    plan === "premium_plus" &&
    status === "active" &&
    (record.subscription_expires_at ? now < record.subscription_expires_at : false);

  const daysRemaining =
    record.subscription_expires_at && record.subscription_expires_at > now
      ? Math.ceil((record.subscription_expires_at - now) / (1000 * 60 * 60 * 24))
      : 0;

  return {
    plan,
    status,
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
          state,
        };
      }

      return {
        allowed: false,
        reason: "PREMIUM_SUBSCRIPTION_REQUIRED",
        plan: "unsubscribed",
        isUnlimited: false,
        state,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { allowed: false, error: msg };
    }
  });

/** TanStack Server Function: Record successful generation for active Premium user */
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

      return {
        success: true,
        plan: current.plan,
        isUnlimited: current.isUnlimited,
        state: current,
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
      // Exactly 30 days duration
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

      const record: ServerStoreRecord = {
        subscription_plan: "premium_plus",
        subscription_status: "active",
        subscription_started_at: now,
        subscription_expires_at: expiresAt,
        last_payment_id: data?.paymentId ?? null,
      };

      serverMemoryStore.set(normalized, record);

      try {
        const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
        if (supabaseAdmin) {
          await (
            supabaseAdmin as unknown as {
              from: (t: string) => { upsert: (d: unknown, o?: unknown) => Promise<unknown> };
            }
          )
            .from("user_subscriptions")
            .upsert(
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
        // Ignored
      }

      const updatedState: ServerSubscriptionState = {
        plan: "premium_plus",
        status: "active",
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
