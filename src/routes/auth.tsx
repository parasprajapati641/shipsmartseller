import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ShipSmart Seller" },
      { name: "description", content: "Sign in or create your ShipSmart Seller account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(128);

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate]);

  const redirectTo = search.redirect ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your inbox for a reset link");
        setMode("login");
        return;
      }

      const emailParsed = emailSchema.safeParse(email);
      const passParsed = passwordSchema.safeParse(password);
      if (!emailParsed.success) {
        toast.error(emailParsed.error.issues[0]?.message ?? "Invalid email");
        return;
      }
      if (!passParsed.success) {
        toast.error(passParsed.error.issues[0]?.message ?? "Invalid password");
        return;
      }

      if (mode === "signup") {
        try {
          const { createDirectAccountFn } = await import("@/lib/auth-actions");
          const directRes = await createDirectAccountFn({
            data: {
              email: emailParsed.data,
              password: passParsed.data,
            },
          });
          if (directRes.error && !directRes.fallback) {
            toast.error(directRes.error);
            return;
          }
        } catch {
          // Fallback gracefully
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });

        if (signInError) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: emailParsed.data,
            password: passParsed.data,
          });
          if (signUpError) throw signUpError;
        }

        toast.success("Account created! Welcome to ShipSmart Seller.");
        navigate({ to: redirectTo, replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#090B14] text-white">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <div className="rounded-2xl border border-[#2A3658] bg-[#121826] p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#6C63FF] text-white font-bold shadow-lg shadow-[#6C63FF]/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">ShipSmart Seller</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mode === "signup"
                ? "Create your account"
                : mode === "forgot"
                  ? "Reset your password"
                  : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {mode === "signup"
                ? "Instant access to your seller dashboard. No credit card required."
                : mode === "forgot"
                  ? "We'll email you a secure reset link."
                  : "Sign in to continue to your dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Email</label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#2A3658] bg-[#1A2235] pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-slate-400 hover:text-[#6C63FF]"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-[#2A3658] bg-[#1A2235] pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6C63FF]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#6C63FF] py-3 text-sm font-extrabold text-white shadow-lg shadow-[#6C63FF]/30 hover:bg-[#5b52e0] disabled:opacity-60 transition-all"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup"
                ? "Create account & Sign in"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </button>
          </form>

          <div className="text-center text-sm text-slate-400">
            {mode === "login" && (
              <>
                New to ShipSmart Seller?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-[#6C63FF] font-semibold hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-[#6C63FF] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => setMode("login")}
                className="text-[#6C63FF] font-semibold hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
