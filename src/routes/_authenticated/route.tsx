import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090B14] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C63FF]" />
      </div>
    );
  }

  // Guest users are allowed to access dashboard, studio, and all optimization features seamlessly.
  return <Outlet />;
}
