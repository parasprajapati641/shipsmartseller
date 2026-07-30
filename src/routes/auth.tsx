import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { getAuthCallbackUrl, formatAuthError } from "@/lib/auth-helpers";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot", "verify-pending"]).optional(),
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
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "verify-pending">(
    search.mode ?? "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: search.redirect ?? "/dashboard", replace: true });
    }
  }, [loading, session, navigate, search.redirect]);

  const redirectTo = search.redirect ?? "/dashboard";

  async function handleResendVerification() {
    const emailParsed = emailSchema.safeParse(email);
    if (!emailParsed.success) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    setResending(true);
    try {
      const callbackUrl = getAuthCallbackUrl("/auth/callback");
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailParsed.data,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent! Please check your inbox.");
    } catch (err) {
      toast.error(formatAuthError(err));
    } finally {
      setResending(false);
    }
  }

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
        const callbackUrl = getAuthCallbackUrl("/auth/callback?next=/reset-password&type=recovery");
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: callbackUrl,
        });
        if (error) throw error;
        toast.success("Check your inbox for a reset link!");
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
        const callbackUrl = getAuthCallbackUrl("/auth/callback");
        let directCreated = false;

        // Try direct server-side admin creation if service role key is available
        try {
          const { createDirectAccountFn } = await import("@/lib/auth-actions");
          const directRes = await createDirectAccountFn({
            data: {
              email: emailParsed.data,
              password: passParsed.data,
            },
          });
          if (directRes.success) {
            directCreated = true;
          }
        } catch {
          // Admin API unavailable or key omitted, proceed with standard client auth
        }

        if (directCreated) {
          // Direct creation succeeded, sign in immediately
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: emailParsed.data,
            password: passParsed.data,
          });
          if (!signInErr) {
            toast.success("Account created! Welcome to ShipSmart Seller.");
            navigate({ to: redirectTo, replace: true });
            return;
          }
        }

        // Standard Supabase Sign Up Flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: {
            emailRedirectTo: callbackUrl,
            data: {
              platform: "ShipSmart Seller",
            },
          },
        });

        if (signUpError) {
          if (
            signUpError.message.toLowerCase().includes("already registered") ||
            signUpError.message.toLowerCase().includes("already exists")
          ) {
            // Attempt login if user exists
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: emailParsed.data,
              password: passParsed.data,
            });
            if (!signInError) {
              toast.success("Welcome back!");
              navigate({ to: redirectTo, replace: true });
              return;
            }
            toast.error("An account with this email already exists. Please sign in.");
            setMode("login");
            return;
          }
          throw signUpError;
        }

        // CASE 1: Email Verification DISABLED in Supabase (Session created immediately)
        if (signUpData.session) {
          toast.success("Account created! Welcome to ShipSmart Seller.");
          navigate({ to: redirectTo, replace: true });
          return;
        }

        // CASE 2: Email Verification ENABLED in Supabase (User created, email confirmation required)
        if (signUpData.user) {
          setMode("verify-pending");
          toast.info("Verification email sent! Please check your inbox.");
          return;
        }

        toast.success("Account created successfully!");
        navigate({ to: redirectTo, replace: true });
      } else {
        // Mode === "login"
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            setMode("verify-pending");
            toast.error("Email not verified yet. Please check your inbox or resend verification.");
            return;
          }
          throw error;
        }

        toast.success("Welcome back!");
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err) {
      toast.error(formatAuthError(err));
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

          {mode === "verify-pending" ? (
            <div className="space-y-6 text-center py-2">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Verify your email</h1>
                <p className="mt-2 text-sm text-slate-300">
                  We've sent a verification link to{" "}
                  <span className="font-semibold text-white">{email || "your email"}</span>.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Click the link in the email to activate your account and access your dashboard.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A3658] bg-[#1A2235] py-2.5 text-sm font-semibold text-white hover:bg-[#232D47] disabled:opacity-60 transition-all"
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#6C63FF]" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-[#6C63FF]" />
                  )}
                  Resend verification email
                </button>

                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : (
            <>
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
                      type="button"
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
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-[#6C63FF] font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </>
                )}
                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-[#6C63FF] font-semibold hover:underline"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
