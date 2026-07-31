import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { migrateGuestDataToUser } from "@/lib/guest-store";

const callbackSearchSchema = z.object({
  code: z.string().optional(),
  token_hash: z.string().optional(),
  type: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
  error_code: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth/callback")({
  validateSearch: callbackSearchSchema,
  head: () => ({
    meta: [
      { title: "Verifying Authentication — ShipSmart Seller" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

export function AuthCallbackPage() {
  const search = useSearch({ from: "/auth/callback" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        // 1. Check for URL error flags passed from Supabase
        if (search.error || search.error_description) {
          const msg =
            search.error_description || search.error || "Authentication link expired or invalid.";
          if (mounted) {
            setErrorMessage(msg);
            setStatus("error");
          }
          return;
        }

        // 2. Check for hash parameters (#error=... or #access_token=...)
        if (typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashError = hashParams.get("error_description") || hashParams.get("error");
          if (hashError) {
            if (mounted) {
              setErrorMessage(hashError);
              setStatus("error");
            }
            return;
          }
        }

        // 3. Handle PKCE Code exchange
        if (search.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(search.code);
          if (error) throw error;
        }

        // 4. Handle OTP Token Hash verification (Email confirmation / magic links)
        if (search.token_hash && search.type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: search.token_hash,
            type: search.type as EmailOtpType,
          });
          if (error) throw error;
        }

        // 5. Check if session is now active
        const { data: sessionData } = await supabase.auth.getSession();
        let activeSession = sessionData.session;

        // If session not immediately available, poll briefly for onAuthStateChange to catch up
        if (!activeSession) {
          for (let i = 0; i < 5; i++) {
            await new Promise((res) => setTimeout(res, 500));
            const { data } = await supabase.auth.getSession();
            if (data.session) {
              activeSession = data.session;
              break;
            }
          }
        }

        if (!activeSession) {
          throw new Error("Unable to establish authentication session. Please try signing in.");
        }

        if (!mounted) return;
        setStatus("success");

        if (activeSession.user?.email) {
          await migrateGuestDataToUser(activeSession.user.email);
        }

        const isRecovery = search.type === "recovery" || search.next === "/reset-password";
        if (isRecovery) {
          toast.success("Identity verified! Set your new password.");
          navigate({ to: "/reset-password", replace: true });
        } else {
          toast.success("Account verified! Welcome to ShipSmart Seller.");
          const target = search.next || "/dashboard";
          navigate({ to: target, replace: true });
        }
      } catch (err) {
        if (!mounted) return;
        console.error("[AuthCallback Error]", err);
        setErrorMessage(err instanceof Error ? err.message : "Authentication callback failed.");
        setStatus("error");
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#090B14] text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#2A3658] bg-[#121826] p-8 shadow-2xl text-center space-y-6">
        {status === "verifying" && (
          <div className="space-y-4 py-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#6C63FF] mx-auto" />
            <h2 className="text-xl font-bold text-white">Verifying your account</h2>
            <p className="text-sm text-slate-400">
              Please wait while we secure your authentication session...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 py-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
            <h2 className="text-xl font-bold text-white">Authentication Successful!</h2>
            <p className="text-sm text-slate-400">Redirecting to your seller dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 py-2 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Verification Link Issue</h2>
            <p className="text-sm text-slate-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs leading-relaxed">
              {errorMessage || "The verification link may have expired or already been used."}
            </p>
            <button
              onClick={() => navigate({ to: "/auth", search: { mode: "login" }, replace: true })}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] px-6 py-3 text-sm font-bold text-white hover:bg-[#5b52e0] transition-colors w-full"
            >
              Back to Sign In <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
