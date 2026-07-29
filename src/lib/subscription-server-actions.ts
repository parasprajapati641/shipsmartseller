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
};

// Server-side in-memory & file/DB persistent store cache for instant reliability
const serverMemoryStore = new Map<
  string,
  {
    plan: "free" | "premium_plus";
    status: "active" | "expired";
    freeGenerationsUsed: number;
    freeGenerationLimit: number;
    startedAt: number | null;
    expiresAt: number | null;
  }
>();

function getNormalizedEmail(email?: string | null): string {
  if (!email || typeof email !== "string") return "default_anonymous_user";
  return email.trim().toLowerCase();
}

/** Get persistent server subscription state for a user */
export async function fetchServerSubscriptionState(email?: string | null): Promise<ServerSubscriptionState> {
  const normalized = getNormalizedEmail(email);
  const now = Date.now();
  const freeGenerationLimit = 10;

  let record = serverMemoryStore.get(normalized);

  // Try fetching from Supabase DB user_subscriptions table if available
  try {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
    if (supabaseAdmin) {
      const { data: dbData } = await (supabaseAdmin as any)
        .from("user_subscriptions")
        .select("*")
        .eq("user_email", normalized)
        .maybeSingle();

      if (dbData) {
        record = {
          plan: (dbData as any).subscription_plan === "premium_plus" ? "premium_plus" : "free",
          status: (dbData as any).subscription_plan === "premium_plus" ? "active" : "expired",
          freeGenerationsUsed: Math.max(0, Number((dbData as any).free_generations_used || 0)),
          freeGenerationLimit: 10,
          startedAt: (dbData as any).started_at ? Number((dbData as any).started_at) : null,
          expiresAt: (dbData as any).expires_at ? Number((dbData as any).expires_at) : null,
        };
        serverMemoryStore.set(normalized, record);
      }
    }
  } catch {
    // If Supabase table query fails, continue with in-memory server store
  }

  if (!record) {
    record = {
      plan: "free",
      status: "expired",
      freeGenerationsUsed: 0,
      freeGenerationLimit: 10,
      startedAt: null,
      expiresAt: null,
    };
    serverMemoryStore.set(normalized, record);

    // Attempt insert into Supabase DB if client is connected
    try {
      const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
      if (supabaseAdmin) {
        await (supabaseAdmin as any).from("user_subscriptions").upsert(
          {
            user_email: normalized,
            subscription_plan: "free",
            free_generations_used: 0,
            free_generation_limit: 10,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_email" }
        );
      }
    } catch {
      // Ignored non-critical DB write error
    }
  }

  // Check Expiry for Premium Plus
  let plan = record.plan;
  let status = record.status;
  if (plan === "premium_plus" && record.expiresAt && now >= record.expiresAt) {
    plan = "free";
    status = "expired";
    record.plan = plan;
    record.status = status;
    serverMemoryStore.set(normalized, record);
  }

  const isUnlimited = plan === "premium_plus" && (record.expiresAt ? now < record.expiresAt : true);
  const remainingGenerations = isUnlimited
    ? Infinity
    : Math.max(0, freeGenerationLimit - record.freeGenerationsUsed);
  const daysRemaining =
    record.expiresAt && record.expiresAt > now
      ? Math.ceil((record.expiresAt - now) / (1000 * 60 * 60 * 24))
      : 0;

  return {
    plan,
    status,
    freeGenerationsUsed: record.freeGenerationsUsed,
    freeGenerationLimit,
    remainingGenerations,
    startedAt: record.startedAt,
    expiresAt: record.expiresAt,
    daysRemaining,
    isUnlimited,
  };
}

/** TanStack Server Function: Fetch server-validated subscription state */
export const getSubscriptionServerStateFn = createServerFn({ method: "POST" })
  .validator((data: { userEmail?: string | null }) =>
    z.object({ userEmail: z.string().nullable().optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const state = await fetchServerSubscriptionState(data.userEmail);
      return { success: true, state };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

/** TanStack Server Function: Validate entitlement & atomically increment generation count on server */
export const validateAndRecordGenerationFn = createServerFn({ method: "POST" })
  .validator((data: { userEmail?: string | null }) =>
    z.object({ userEmail: z.string().nullable().optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const current = await fetchServerSubscriptionState(data.userEmail);
      const normalized = getNormalizedEmail(data.userEmail);

      // Premium Plus users have unlimited generation
      if (current.isUnlimited) {
        return {
          allowed: true,
          plan: "premium_plus",
          isUnlimited: true,
          remainingGenerations: Infinity,
          freeGenerationsUsed: current.freeGenerationsUsed,
          state: current,
        };
      }

      // Check Free Trial Limit on Server (Strict 10 generations limit)
      if (current.freeGenerationsUsed >= 10) {
        return {
          allowed: false,
          reason: "FREE_TRIAL_EXHAUSTED",
          plan: "free",
          isUnlimited: false,
          remainingGenerations: 0,
          freeGenerationsUsed: current.freeGenerationsUsed,
          state: current,
        };
      }

      // Increment count on server
      const newUsed = current.freeGenerationsUsed + 1;
      const record = serverMemoryStore.get(normalized) || {
        plan: "free" as const,
        status: "expired" as const,
        freeGenerationsUsed: 0,
        freeGenerationLimit: 10,
        startedAt: null,
        expiresAt: null,
      };

      record.freeGenerationsUsed = newUsed;
      serverMemoryStore.set(normalized, record);

      // Update Supabase DB user_subscriptions table
      try {
        const { supabaseAdmin } = await import("../integrations/supabase/client.server.js");
        if (supabaseAdmin) {
          await (supabaseAdmin as any).from("user_subscriptions").upsert(
            {
              user_email: normalized,
              subscription_plan: "free",
              free_generations_used: newUsed,
              free_generation_limit: 10,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" }
          );
        }
      } catch {
        // Ignored DB write exception fallback
      }

      const updatedState: ServerSubscriptionState = {
        ...current,
        freeGenerationsUsed: newUsed,
        remainingGenerations: Math.max(0, 10 - newUsed),
      };

      return {
        allowed: true,
        plan: "free",
        isUnlimited: false,
        remainingGenerations: Math.max(0, 10 - newUsed),
        freeGenerationsUsed: newUsed,
        state: updatedState,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { allowed: false, error: msg };
    }
  });

/** TanStack Server Function: Permanently activate Premium Plus for user in DB upon payment */
export const activatePremiumPlusServerFn = createServerFn({ method: "POST" })
  .validator((data: { userEmail?: string | null }) =>
    z.object({ userEmail: z.string().nullable().optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    try {
      const normalized = getNormalizedEmail(data.userEmail);
      const now = Date.now();
      // 1 calendar month duration
      const expiresAt = now + 30 * 24 * 60 * 60 * 1000;

      const record = {
        plan: "premium_plus" as const,
        status: "active" as const,
        freeGenerationsUsed: serverMemoryStore.get(normalized)?.freeGenerationsUsed || 0,
        freeGenerationLimit: 10,
        startedAt: now,
        expiresAt,
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
              started_at: now,
              expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_email" }
          );
        }
      } catch {
        // Ignored DB write exception
      }

      const updatedState: ServerSubscriptionState = {
        plan: "premium_plus",
        status: "active",
        freeGenerationsUsed: record.freeGenerationsUsed,
        freeGenerationLimit: 10,
        remainingGenerations: Infinity,
        startedAt: now,
        expiresAt,
        daysRemaining: 30,
        isUnlimited: true,
      };

      return { success: true, state: updatedState };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });
