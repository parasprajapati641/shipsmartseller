// Production Subscription & Expiry Engine — ShipSmart Seller
// 30-Day Free Trial for every new user + Premium Plan ₹999/month (30 Days Unlimited Access)

import { supabase } from "@/integrations/supabase/client";
import { getOrCreateGuestId } from "./guest-store";

export type SubscriptionPlan = "trial" | "premium_plus" | "expired" | "unsubscribed";
export type SubscriptionStatus = "active" | "expired";

export type UserSubscriptionState = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isTrial: boolean;
  startedAt: number | null;
  expiresAt: number | null;
  daysRemaining: number;
  isUnlimited: boolean;
};

const SUBSCRIPTION_STORAGE_KEY = "shipsmart_user_subscription_v7";

function getStorageKey(userEmail?: string | null): string {
  if (userEmail && userEmail.trim().length > 0) {
    return `${SUBSCRIPTION_STORAGE_KEY}_${userEmail.trim().toLowerCase()}`;
  }
  const guestId = getOrCreateGuestId();
  return `${SUBSCRIPTION_STORAGE_KEY}_${guestId}`;
}

/** Computes 1 calendar month after the given date */
export function addOneCalendarMonth(startDate: Date): Date {
  const target = new Date(startDate.getTime());
  const currentMonth = target.getMonth();
  target.setMonth(currentMonth + 1);

  if (target.getMonth() !== (currentMonth + 1) % 12) {
    target.setDate(0);
  }
  return target;
}

/** Creates default 30-Day Free Trial state for a new user */
export function createDefaultTrialState(): UserSubscriptionState {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return {
    plan: "trial",
    status: "active",
    isTrial: true,
    startedAt: now,
    expiresAt: now + thirtyDays,
    daysRemaining: 30,
    isUnlimited: true,
  };
}

/**
 * Asynchronously loads subscription state from MongoDB Express API / Supabase DB.
 * Automatically provisions a 30-Day Free Trial for new accounts.
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
        const rawPlan = data.state.plan;
        const now = Date.now();
        const expiresAt = data.state.expiresAt ? Number(data.state.expiresAt) : null;
        const isExpired = expiresAt ? now >= expiresAt : false;

        const isTrial = Boolean(data.state.isTrial ?? (rawPlan === "trial"));
        const plan: SubscriptionPlan = isExpired
          ? "expired"
          : rawPlan === "premium_plus"
            ? "premium_plus"
            : isTrial
              ? "trial"
              : "unsubscribed";

        const status: SubscriptionStatus = isExpired ? "expired" : "active";
        const daysRemaining = expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
        const isUnlimited = !isExpired && (status === "active");

        const state: UserSubscriptionState = {
          plan,
          status,
          isTrial,
          startedAt: data.state.startedAt ? Number(data.state.startedAt) : null,
          expiresAt,
          daysRemaining,
          isUnlimited,
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
      const now = Date.now();
      const expiresAt = data.subscription_expires_at ? Number(data.subscription_expires_at) : null;
      const isExpired = expiresAt ? now >= expiresAt : false;
      const isTrial = Boolean(data.is_trial ?? (data.subscription_plan === "trial"));

      const plan: SubscriptionPlan = isExpired
        ? "expired"
        : data.subscription_plan === "premium_plus"
          ? "premium_plus"
          : isTrial
            ? "trial"
            : "unsubscribed";

      const status: SubscriptionStatus = isExpired ? "expired" : "active";
      const startedAt = data.subscription_started_at ? Number(data.subscription_started_at) : null;
      const daysRemaining = expiresAt && expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;
      const isUnlimited = !isExpired && status === "active";

      const state: UserSubscriptionState = {
        plan,
        status,
        isTrial,
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
    return createDefaultTrialState();
  }

  const key = getStorageKey(userEmail);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      const startedAt = parsed.startedAt ? Number(parsed.startedAt) : now;
      const expiresAt = parsed.expiresAt ? Number(parsed.expiresAt) : now + 30 * 24 * 60 * 60 * 1000;
      const isExpired = now >= expiresAt;

      const isTrial = parsed.isTrial ?? (parsed.plan === "trial" || !parsed.plan || parsed.plan === "unsubscribed");
      const plan: SubscriptionPlan = isExpired
        ? "expired"
        : parsed.plan === "premium_plus"
          ? "premium_plus"
          : isTrial
            ? "trial"
            : "unsubscribed";

      const status: SubscriptionStatus = isExpired ? "expired" : "active";
      const isUnlimited = !isExpired && status === "active";
      const daysRemaining = expiresAt > now ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

      return {
        plan,
        status,
        isTrial,
        startedAt,
        expiresAt,
        daysRemaining,
        isUnlimited,
      };
    }
  } catch {
    // LocalStorage fallback
  }

  const defaultState = createDefaultTrialState();
  saveSubscriptionState(defaultState, userEmail);
  return defaultState;
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
        isTrial: state.isTrial,
        startedAt: state.startedAt,
        expiresAt: state.expiresAt,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Safeguard
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
    isTrial: false,
    startedAt,
    expiresAt,
    daysRemaining,
    isUnlimited: true,
  };

  saveSubscriptionState(newState, userEmail);
  return newState;
}

