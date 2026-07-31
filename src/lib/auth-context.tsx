import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Synchronize auth state with Supabase events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    // Check stored session on initial mount
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("[Auth] Initial session error:", error.message);
        }
        setSession(data.session);
      })
      .catch((err) => {
        console.error("[Auth] Unexpected session error:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          setSession(null);
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("[Auth] Sign-out error:", err);
          }
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
