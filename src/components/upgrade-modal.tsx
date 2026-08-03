import { useState } from "react";
import { X, Check, Zap, Sparkles, Lock, RefreshCw, AlertTriangle } from "lucide-react";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onUpgradeSuccess?: () => void;
  isExpired?: boolean;
}

export function UpgradeModal({
  isOpen,
  onClose,
  userEmail,
  onUpgradeSuccess,
  isExpired = false,
}: UpgradeModalProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  if (!isOpen) return null;

  const handleUpgradeNow = async () => {
    setLoadingCheckout(true);
    try {
      await openRazorpayCheckout({
        plan: "premium_plus",
        amountInRupees: 999,
        userEmail: userEmail ?? undefined,
        onSuccess: () => {
          onUpgradeSuccess?.();
          onClose();
        },
      });
    } catch (err) {
      console.error("Razorpay checkout error:", err);
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B14]/90 p-4 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#2A3658] bg-[#121826] p-6 shadow-2xl space-y-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#2A3658] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl font-extrabold shadow-lg ${
                isExpired
                  ? "bg-amber-500 text-slate-950 shadow-amber-500/20"
                  : "bg-gradient-to-br from-[#FFB020] to-orange-500 text-slate-950 shadow-[#FFB020]/20"
              }`}
            >
              {isExpired ? (
                <AlertTriangle className="h-5 w-5 text-slate-950" />
              ) : (
                <Lock className="h-5 w-5 text-slate-950" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                {isExpired ? "Free Trial Ended" : "Premium Subscription Required"}
              </h2>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                {isExpired ? (
                  <>
                    Your free trial has ended.
                    <br />
                    Upgrade to Premium for ₹999/month to continue.
                  </>
                ) : (
                  <>
                    Your free trial has ended.
                    <br />
                    Upgrade to Premium for ₹999/month to continue.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Benefits Checklist */}
        <div className="space-y-3 rounded-xl border border-[#6C63FF]/30 bg-[#6C63FF]/10 p-4 text-xs">
          <div className="font-extrabold text-[#6C63FF] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#00D4AA]" /> Benefits Included with Premium Plus
          </div>

          <div className="grid grid-cols-1 gap-2 text-slate-200">
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Unlimited Image Generation</span>
            </div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Unlimited AI Auto Pilot</span>
            </div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Unlimited One Click Studio</span>
            </div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Unlimited KB Compression</span>
            </div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Priority Processing</span>
            </div>
            <div className="flex items-center gap-2.5 font-semibold">
              <Check className="h-4 w-4 text-[#00D4AA] shrink-0" />
              <span>Future Premium Features</span>
            </div>
          </div>
        </div>

        {/* Price Tag & Actions */}
        <div className="space-y-4 pt-2 border-t border-[#2A3658]">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Subscription Plan</span>
              <span className="text-2xl font-extrabold text-white">Premium Plus</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[#00D4AA]">₹999</span>
              <span className="text-xs text-slate-400 block font-semibold">/ Month</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-[#2A3658] bg-[#1A2235] py-3 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
            >
              Maybe Later
            </button>

            <button
              onClick={handleUpgradeNow}
              disabled={loadingCheckout}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] py-3 text-xs font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {isExpired ? <RefreshCw className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {isExpired ? "Renew Premium" : "Upgrade Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
