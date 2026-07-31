// Production Subscription & Expiry Engine — ShipSmart Seller
// Single Source of Truth: Supabase Database `user_subscriptions` table.
// Plans:
//  - Free Trial: 10 Lifetime Free Generations (never resets)
//  - Premium Plus: ₹999 / month (30 Days Unlimited Access, auto-downgrade on expiry)

import { supabase } from "@/integrations/supabase/client";
import { getOrCreateGuestId } from "./guest-store";

export type SubscriptionPlan = "free" | "premium_plus";
export type SubscriptionStatus = "active" | "expired";

export type UserSubscriptionState = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  freeGenerationsUsed: number;
  freeGenerationLimit: number;
  remainingGenerations: number;
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isUnlimited: boolean;
};

const SUBSCRIPTION_STORAGE_KEY = "shipsmart_user_subscription_v5";

function getStorageKey(userEmail?: string | null): string {
  if (userEmail && userEmail.trim().length > 0) {
    return `${SUBSCRIPTION_STORAGE_KEY}_${userEmail.trim().toLowerCase()}`;
  }
  const guestId = getOrCreateGuestId();
  return `${SUBSCRIPTION_STORAGE_KEY}_${guestId}`;
}

/** Computes 1 calendar month after the given date (e.g. July 30 -> August 30) */
export function addOneCalendarMonth(startDate: Date): Date {
  const target = new Date(startDate.getTime());
  const currentMonth = target.getMonth();
  target.setMonth(currentMonth + 1);

  if (target.getMonth() !== (currentMonth + 1) % 12) {
    target.setDate(0);
  }
  return target;
}

/**
 * Asynchronously loads the subscription state directly from Supabase Database `user_subscriptions` table.
 * Single Source of Truth: Database Row in `public.user_subscriptions`.
 * Reads free_generations_used from Supabase and calculates remaining = limit - used.
 */
export async function fetchSubscriptionStateFromDatabase(
  userEmail?: string | null,
): Promise<UserSubscriptionState> {
  if (typeof window === "undefined") return loadSubscriptionState(userEmail);

  const normEmail =
    userEmail && userEmail.trim().length > 0
      ? userEmail.trim().toLowerCase()
      : getOrCreateGuestId();

  console.log(`[SUBSCRIPTION STORE] Fetching ground truth for email: ${normEmail}`);

  try {
    const { data, error } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("user_subscriptions")
      .select("*")
      .eq("user_email", normEmail)
      .maybeSingle();

    if (error) {
      console.error(`[SUBSCRIPTION DB ERROR] Table select error:`, error);
    } else if (data) {
      const freeGenerationsUsed = Math.max(0, Number(data.free_generations_used || 0));
      const freeGenerationLimit = Number(data.free_generations_limit || 10);
      const plan: SubscriptionPlan =
        data.subscription_plan === "premium_plus" ? "premium_plus" : "free";
      const status: SubscriptionStatus =
        data.subscription_status === "active" ? "active" : "expired";
      const startedAt = data.subscription_started_at ? Number(data.subscription_started_at) : null;
      const expiresAt = data.subscription_expires_at ? Number(data.subscription_expires_at) : null;
      const now = Date.now();

      const isUnlimited =
        plan === "premium_plus" && status === "active" && !!expiresAt && now < expiresAt;
      const remainingGenerations = isUnlimited
        ? Infinity
        : Math.max(0, freeGenerationLimit - freeGenerationsUsed);
      const daysRemaining =
        expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

      const state: UserSubscriptionState = {
        plan,
        status,
        freeGenerationsUsed,
        freeGenerationLimit,
        remainingGenerations,
        startedAt,
        expiresAt,
        daysRemaining,
        isUnlimited,
      };

      console.log(
        `[SUBSCRIPTION DB SUCCESS] Email: ${normEmail} | Used: ${freeGenerationsUsed} | Remaining: ${remainingGenerations}`,
      );
      saveSubscriptionState(state, userEmail);
      return state;
    } else {
      console.log(
        `[SUBSCRIPTION DB INIT] Creating initial subscription row in Supabase for ${normEmail}...`,
      );
      try {
        await (
          supabase as unknown as {
            from: (t: string) => {
              insert: (d: Record<string, unknown>) => Promise<{ error: unknown }>;
            };
          }
        )
          .from("user_subscriptions")
          .insert({
            user_email: normEmail,
            subscription_plan: "free",
            subscription_status: "expired",
            free_generations_used: 0,
            free_generations_limit: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } catch (insErr) {
        console.warn("[SUBSCRIPTION DB INIT WARNING]", insErr);
      }
    }
  } catch (err) {
    console.error("[SUBSCRIPTION DB EXCEPTION]:", err);
  }

  return loadSubscriptionState(userEmail);
}

export function loadSubscriptionState(userEmail?: string | null): UserSubscriptionState {
  if (typeof window === "undefined") {
    return {
      plan: "free",
      status: "expired",
      freeGenerationsUsed: 0,
      freeGenerationLimit: 10,
      remainingGenerations: 10,
      startedAt: null,
      expiresAt: null,
      daysRemaining: 0,
      isUnlimited: false,
    };
  }

  const key = getStorageKey(userEmail);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      let plan: SubscriptionPlan = parsed.plan === "premium_plus" ? "premium_plus" : "free";
      let status: SubscriptionStatus = parsed.status === "active" ? "active" : "expired";
      const freeGenerationsUsed = Math.max(0, Number(parsed.freeGenerationsUsed || 0));
      const freeGenerationLimit = 10;
      const startedAt = parsed.startedAt ? Number(parsed.startedAt) : null;
      const expiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : null;

      const now = Date.now();

      if (plan === "premium_plus" && expiresAt && now >= expiresAt) {
        plan = "free";
        status = "expired";
      }

      const isUnlimited =
        plan === "premium_plus" && status === "active" && !!expiresAt && now < expiresAt;
      const daysRemaining =
        expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

      const remainingGenerations = isUnlimited
        ? Infinity
        : Math.max(0, freeGenerationLimit - freeGenerationsUsed);

      const state: UserSubscriptionState = {
        plan,
        status,
        freeGenerationsUsed,
        freeGenerationLimit,
        remainingGenerations,
        startedAt,
        expiresAt,
        daysRemaining,
        isUnlimited,
      };

      return state;
    }
  } catch {
    // Fallback
  }

  return {
    plan: "free",
    status: "expired",
    freeGenerationsUsed: 0,
    freeGenerationLimit: 10,
    remainingGenerations: 10,
    startedAt: null,
    expiresAt: null,
    daysRemaining: 0,
    isUnlimited: false,
  };
}

export function saveSubscriptionState(
  state: UserSubscriptionState,
  userEmail?: string | null,
): void {
  if (typeof window === "undefined") return;

  const key = getStorageKey(userEmail);
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        plan: state.plan,
        status: state.status,
        freeGenerationsUsed: state.freeGenerationsUsed,
        freeGenerationLimit: 10,
        startedAt: state.startedAt,
        expiresAt: state.expiresAt,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // LocalStorage quota safeguard
  }
}

export function incrementFreeGenerations(userEmail?: string | null): UserSubscriptionState {
  const current = loadSubscriptionState(userEmail);
  if (current.isUnlimited) return current;

  const updatedUsed = current.freeGenerationsUsed + 1;
  const newState: UserSubscriptionState = {
    ...current,
    freeGenerationsUsed: updatedUsed,
    remainingGenerations: Math.max(0, 10 - updatedUsed),
  };

  saveSubscriptionState(newState, userEmail);

  if (typeof window !== "undefined") {
    const normEmail =
      userEmail && userEmail.trim().length > 0
        ? userEmail.trim().toLowerCase()
        : getOrCreateGuestId();

    try {
      (
        supabase as unknown as {
          from: (t: string) => {
            upsert: (r: Record<string, unknown>, o?: unknown) => Promise<unknown>;
          };
        }
      )
        .from("user_subscriptions")
        .upsert(
          {
            user_email: normEmail,
            subscription_plan: newState.plan,
            subscription_status: newState.status,
            free_generations_used: updatedUsed,
            free_generations_limit: 10,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_email" },
        )
        .catch(() => {});
    } catch {
      // ignore
    }
  }

  return newState;
}

/** Activates or renews Premium Plus subscription for exactly 30 days (₹999/month) */
export function activateMonthlyPremiumPlus(userEmail?: string | null): UserSubscriptionState {
  const current = loadSubscriptionState(userEmail);
  const now = Date.now();
  const startedAt = now;
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  const daysRemaining = 30;

  const newState: UserSubscriptionState = {
    ...current,
    plan: "premium_plus",
    status: "active",
    startedAt,
    expiresAt,
    daysRemaining,
    remainingGenerations: Infinity,
    isUnlimited: true,
  };

  saveSubscriptionState(newState, userEmail);
  return newState;
}
