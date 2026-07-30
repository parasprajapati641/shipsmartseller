// Production Subscription & Expiry Engine — ShipSmart Seller
//
// Plans:
//  - Free Trial: 10 Lifetime Free Generations (never resets)
//  - Premium Plus: ₹999 / month (1 Calendar Month cycle, auto-downgrade on expiry)

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

const SUBSCRIPTION_STORAGE_KEY = "shipsmart_user_subscription_v3";

/** Computes 1 calendar month after the given date (e.g. July 29 -> August 29) */
export function addOneCalendarMonth(startDate: Date): Date {
  const target = new Date(startDate.getTime());
  const currentMonth = target.getMonth();
  target.setMonth(currentMonth + 1);

  // If the target month has fewer days (e.g., Jan 31 -> Feb 28), adjust to last valid day
  if (target.getMonth() !== (currentMonth + 1) % 12) {
    target.setDate(0);
  }
  return target;
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

  const key = userEmail ? `${SUBSCRIPTION_STORAGE_KEY}_${userEmail}` : SUBSCRIPTION_STORAGE_KEY;

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

      // Check Expiry: If Premium Plus has passed its expiry date, automatically downgrade to free/expired
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

      // Save synced state if auto-downgraded
      if (plan === "free" && parsed.plan === "premium_plus") {
        saveSubscriptionState(state, userEmail);
      }

      return state;
    }
  } catch {
    // Fallback if JSON parse fails
  }

  // Default state for NEW account (do NOT automatically save to localStorage until confirmed from DB)
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

  const key = userEmail ? `${SUBSCRIPTION_STORAGE_KEY}_${userEmail}` : SUBSCRIPTION_STORAGE_KEY;
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
    // LocalStorage quota error safeguard
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
  return newState;
}

/** Activates or renews Premium Plus subscription for exactly 30 days */
export function activateMonthlyPremiumPlus(userEmail?: string | null): UserSubscriptionState {
  const current = loadSubscriptionState(userEmail);
  const now = Date.now();
  const startedAt = now;
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // Exactly 30 days
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
