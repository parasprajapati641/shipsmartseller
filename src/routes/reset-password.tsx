import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { formatAuthError } from "@/lib/auth-helpers";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ShipSmart Seller" },
      { name: "description", content: "Set a new password for your ShipSmart Seller account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

const passwordSchema = z.string().min(6, "At least 6 characters").max(128);

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Password reset session expired or missing. Please request a new link.");
      }
      setSessionChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success("Password updated successfully! Welcome back.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090B14] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#090B14] text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#2A3658] bg-[#121826] p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#6C63FF] text-white font-bold shadow-lg shadow-[#6C63FF]/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">ShipSmart Seller</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Set a new password</h1>
            <p className="mt-1 text-sm text-slate-400">
              Enter your new password below to update your account credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">New Password</label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#2A3658] bg-[#1A2235] pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] py-3 text-sm font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5b52e0] disabled:opacity-60 transition-all"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password & Sign in
            </button>
          </form>

          <div className="text-center text-sm text-slate-400">
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="text-[#6C63FF] font-semibold hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
