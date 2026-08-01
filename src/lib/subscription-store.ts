// Production Subscription & Expiry Engine — ShipSmart Seller (Premium-Only Model)
// Single Source of Truth: Premium Plus ₹999/month (30 Days Unlimited Access, auto-downgrade on expiry)

import { supabase } from "@/integrations/supabase/client";
import { getOrCreateGuestId } from "./guest-store";

export type SubscriptionPlan = "premium_plus" | "unsubscribed";
export type SubscriptionStatus = "active" | "expired";

export type UserSubscriptionState = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isUnlimited: boolean;
};

const SUBSCRIPTION_STORAGE_KEY = "shipsmart_user_subscription_v6";

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
 * Asynchronously loads the subscription state directly from MongoDB Express API / Supabase DB.
 */
export async function fetchSubscriptionStateFromDatabase(
  userEmail?: string | null,
): Promise<UserSubscriptionState> {
  if (typeof window === "undefined") return loadSubscriptionState(userEmail);

  const normEmail =
    userEmail && userEmail.trim().length > 0
      ? userEmail.trim().toLowerCase()
      : getOrCreateGuestId();

  console.log(`[SUBSCRIPTION STORE] Fetching subscription state for email: ${normEmail}`);

  // 1. Try Express backend MongoDB endpoint first
  try {
    const res = await fetch(`http://localhost:5000/api/subscription?userEmail=${encodeURIComponent(normEmail)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.state) {
        const state: UserSubscriptionState = {
          plan: data.state.plan === "premium_plus" ? "premium_plus" : "unsubscribed",
          status: data.state.status === "active" ? "active" : "expired",
          startedAt: data.state.startedAt ? Number(data.state.startedAt) : null,
          expiresAt: data.state.expiresAt ? Number(data.state.expiresAt) : null,
          daysRemaining: Number(data.state.daysRemaining || 0),
          isUnlimited: Boolean(data.state.isUnlimited),
        };
        saveSubscriptionState(state, userEmail);
        return state;
      }
    }
  } catch (backendErr) {
    console.warn("[SUBSCRIPTION STORE] MongoDB backend fetch fallback:", backendErr);
  }

  // 2. Supabase fallback check
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

    if (!error && data) {
      const plan: SubscriptionPlan =
        data.subscription_plan === "premium_plus" ? "premium_plus" : "unsubscribed";
      const status: SubscriptionStatus =
        data.subscription_status === "active" ? "active" : "expired";
      const startedAt = data.subscription_started_at ? Number(data.subscription_started_at) : null;
      const expiresAt = data.subscription_expires_at ? Number(data.subscription_expires_at) : null;
      const now = Date.now();

      const isUnlimited =
        plan === "premium_plus" && status === "active" && !!expiresAt && now < expiresAt;
      const daysRemaining =
        expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

      const state: UserSubscriptionState = {
        plan: isUnlimited ? "premium_plus" : "unsubscribed",
        status: isUnlimited ? "active" : "expired",
        startedAt,
        expiresAt,
        daysRemaining,
        isUnlimited,
      };

      saveSubscriptionState(state, userEmail);
      return state;
    }
  } catch (err) {
    console.error("[SUBSCRIPTION DB EXCEPTION]:", err);
  }

  return loadSubscriptionState(userEmail);
}

export function loadSubscriptionState(userEmail?: string | null): UserSubscriptionState {
  if (typeof window === "undefined") {
    return {
      plan: "unsubscribed",
      status: "expired",
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
      let plan: SubscriptionPlan = parsed.plan === "premium_plus" ? "premium_plus" : "unsubscribed";
      let status: SubscriptionStatus = parsed.status === "active" ? "active" : "expired";
      const startedAt = parsed.startedAt ? Number(parsed.startedAt) : null;
      const expiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : null;

      const now = Date.now();

      if (plan === "premium_plus" && expiresAt && now >= expiresAt) {
        plan = "unsubscribed";
        status = "expired";
      }

      const isUnlimited =
        plan === "premium_plus" && status === "active" && !!expiresAt && now < expiresAt;
      const daysRemaining =
        expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

      const state: UserSubscriptionState = {
        plan,
        status,
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
    plan: "unsubscribed",
    status: "expired",
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
        startedAt: state.startedAt,
        expiresAt: state.expiresAt,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // LocalStorage quota safeguard
  }
}

/** Activates or renews Premium Plus subscription for exactly 30 days (₹999/month) */
export function activateMonthlyPremiumPlus(userEmail?: string | null): UserSubscriptionState {
  const now = Date.now();
  const startedAt = now;
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  const daysRemaining = 30;

  const newState: UserSubscriptionState = {
    plan: "premium_plus",
    status: "active",
    startedAt,
    expiresAt,
    daysRemaining,
    isUnlimited: true,
  };

  saveSubscriptionState(newState, userEmail);
  return newState;
}
