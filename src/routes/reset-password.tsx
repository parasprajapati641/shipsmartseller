import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Ship Smart" },
      { name: "description", content: "Set a new password for your Ship Smart account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().min(6, "At least 6 characters").max(128).safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="w-full max-w-md">
        <div className="rounded-2xl surface p-8 shadow-elevated">
          <div className="flex items-center gap-2 mb-6">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
              <Sparkles className="h-4 w-4 text-brand-foreground" />
            </div>
            <span className="text-lg font-semibold">Ship Smart</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your new password below to complete the reset.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-medium text-brand-foreground disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
