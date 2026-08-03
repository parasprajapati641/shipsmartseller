import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Zap, User, Calendar, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  loadSubscriptionState,
  fetchSubscriptionStateFromDatabase,
  type UserSubscriptionState,
} from "@/lib/subscription-store";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { UpgradeModal } from "@/components/upgrade-modal";

export const Route = createFileRoute("/_authenticated/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "User Profile & Subscription Status — ShipSmart Seller" },
      { name: "description", content: "View your subscription status, current plan, and expiry date." },
    ],
  }),
  component: SettingsPage,
});

/** Formats a timestamp into strict DD/MM/YYYY format */
function formatDDMMYYYY(timestamp: number | null): string {
  if (!timestamp || typeof timestamp !== "number") {
    // Default 30 days from now if missing
    const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subState, setSubState] = useState<UserSubscriptionState>(() =>
    loadSubscriptionState(user?.email),
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionStateFromDatabase(user?.email).then((state) => setSubState(state));
  }, [user?.email]);

  const handleUpgradeSuccess = () => {
    fetchSubscriptionStateFromDatabase(user?.email).then((state) => setSubState(state));
  };

  const getPlanDisplayName = () => {
    if (subState.plan === "premium_plus") return "Premium Plan";
    if (subState.isTrial && subState.isUnlimited) return "Free Trial";
    if (subState.status === "expired" || subState.plan === "expired") return "Trial Expired";
    return "Free Trial";
  };

  return (
    <div className="min-h-screen bg-[#090B14] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#2A3658] bg-[#121826]/90 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 text-xs font-extrabold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-2 border-l border-[#2A3658] pl-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#6C63FF] text-white font-bold shadow-lg shadow-[#6C63FF]/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">ShipSmart Seller</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2A3658] bg-[#1A2235] px-3 py-1.5 text-slate-200">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-[#6C63FF] text-white font-bold">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs font-semibold max-w-[200px] truncate">{user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6C63FF]/40 bg-[#6C63FF]/15 px-3.5 py-1.5 text-xs font-extrabold text-white mb-3">
            <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" />
            <span>🎉 30-Day Free Trial</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">User Profile & Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your account credentials, subscription plan status, and trial duration.
          </p>
        </div>

        {/* Account Summary Card */}
        <div className="rounded-2xl border border-[#2A3658] bg-[#121826] p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-[#2A3658] pb-3">
            <User className="h-4 w-4 text-[#6C63FF]" /> Account Credentials
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-xs font-medium">
            <div>
              <span className="text-slate-400 block mb-1">User Email</span>
              <span className="text-white font-bold text-sm bg-[#1A2235] px-3 py-2 rounded-xl block border border-[#2A3658]">
                {user?.email ?? "Seller Account"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Account Role</span>
              <span className="text-[#00D4AA] font-bold text-sm bg-[#1A2235] px-3 py-2 rounded-xl flex items-center gap-1.5 border border-[#2A3658]">
                <ShieldCheck className="h-4 w-4 text-[#00D4AA]" /> Verified E-Commerce Seller
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Status Card (Requirement 10) */}
        <div className="rounded-2xl border border-[#6C63FF]/40 bg-gradient-to-br from-[#121826] via-[#1A2235] to-[#121826] p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#2A3658] pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#6C63FF]">
                Subscription Status
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Current Subscription</h2>
            </div>
            {subState.isTrial && subState.isUnlimited ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6C63FF]/40 bg-[#6C63FF]/20 px-4 py-1.5 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/20">
                <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" />
                <span>🎉 30-Day Free Trial Active</span>
              </div>
            ) : subState.isUnlimited ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold text-emerald-400">
                <Zap className="h-3.5 w-3.5 fill-emerald-400" />
                <span>Premium Plan Active</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C7C]/40 bg-[#FF5C7C]/10 px-4 py-1.5 text-xs font-extrabold text-[#FF5C7C]">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Trial Expired</span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#2A3658] bg-[#090B14] p-5 space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Current Plan:
              </span>
              <span className="text-2xl font-extrabold text-white block">
                {getPlanDisplayName()}
              </span>
              <span className="text-xs text-slate-400 block pt-1 font-medium">
                {subState.isTrial
                  ? "Full access to all Premium AI features during 30-day trial."
                  : subState.isUnlimited
                    ? "Full monthly Premium access (₹999/month)."
                    : "Trial ended. Upgrade to Premium to continue."}
              </span>
            </div>

            <div className="rounded-xl border border-[#2A3658] bg-[#090B14] p-5 space-y-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Expiry Date:
              </span>
              <span className="text-2xl font-extrabold text-[#00D4AA] flex items-center gap-2">
                <Calendar className="h-5 w-5 text-[#00D4AA]" />
                {formatDDMMYYYY(subState.expiresAt)}
              </span>
              <span className="text-xs text-slate-400 block pt-1 font-medium">
                {subState.daysRemaining > 0
                  ? `${subState.daysRemaining} days remaining on your subscription.`
                  : "Subscription expired."}
              </span>
            </div>
          </div>

          {/* Progress Bar for Trial */}
          <div className="space-y-2 border-t border-[#2A3658] pt-4">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Trial / Subscription Period</span>
              <span>{subState.daysRemaining} / 30 Days Remaining</span>
            </div>
            <div className="h-3 w-full rounded-full bg-[#090B14] p-0.5 border border-[#2A3658]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] transition-all duration-500 shadow-lg shadow-[#00D4AA]/20"
                style={{
                  width: `${Math.max(5, Math.min(100, Math.round((subState.daysRemaining / 30) * 100)))}%`,
                }}
              />
            </div>
          </div>

          {/* Upgrade Action Button */}
          <div className="pt-2 flex flex-wrap gap-4 items-center justify-between">
            <p className="text-xs text-slate-400 max-w-md">
              Upgrade anytime to Premium Plan (₹999/month) for permanent catalog optimization.
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 transition-all"
            >
              <Zap className="h-4 w-4" />
              {subState.isUnlimited ? "Upgrade to Premium Plan (₹999/mo)" : "Renew Premium Plan"}
            </button>
          </div>
        </div>
      </main>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user?.email}
        onUpgradeSuccess={handleUpgradeSuccess}
        isExpired={!subState.isUnlimited}
      />
    </div>
  );
}
