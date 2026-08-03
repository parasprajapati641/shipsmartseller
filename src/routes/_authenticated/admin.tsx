import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Users,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  UserCheck,
  PlusCircle,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel — Trial & User Management | ShipSmart Seller" },
      { name: "description", content: "View all trial users, expiry dates, convert users to Premium, and manually extend trials." },
    ],
  }),
  component: AdminPage,
});

type AdminUserRecord = {
  userEmail: string;
  plan: string;
  status: string;
  isTrial: boolean;
  startDate: number | null;
  expiryDate: number | null;
  daysRemaining: number;
  paymentId: string | null;
  remindersSent: string[];
};

function formatDDMMYYYY(timestamp: number | null): string {
  if (!timestamp || typeof timestamp !== "number") return "30 Days";
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdminUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      } else {
        // Fallback default demonstration user record
        setUsers([
          {
            userEmail: user?.email ?? "seller@shipsmart.app",
            plan: "trial",
            status: "active",
            isTrial: true,
            startDate: Date.now(),
            expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            daysRemaining: 30,
            paymentId: null,
            remindersSent: [],
          },
        ]);
      }
    } catch (err) {
      console.warn("[ADMIN FETCH USERS FALLBACK]", err);
      setUsers([
        {
          userEmail: user?.email ?? "seller@shipsmart.app",
          plan: "trial",
          status: "active",
          isTrial: true,
          startDate: Date.now(),
          expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          daysRemaining: 30,
          paymentId: null,
          remindersSent: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const handleConvertUser = async (targetEmail: string) => {
    setActionLoading(`convert_${targetEmail}`);
    try {
      const res = await fetch("http://localhost:5000/api/admin/convert-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: targetEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`User ${targetEmail} successfully converted to Premium Plan!`);
        fetchAdminUsers();
      } else {
        toast.error(data.message || "Failed to convert user");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Conversion request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtendTrial = async (targetEmail: string, days: number) => {
    setActionLoading(`extend_${targetEmail}`);
    try {
      const res = await fetch("http://localhost:5000/api/admin/extend-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: targetEmail, days }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Trial for ${targetEmail} extended by ${days} days!`);
        fetchAdminUsers();
      } else {
        toast.error(data.message || "Failed to extend trial");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extend trial request failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.userEmail.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

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
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
                <Shield className="h-4 w-4 text-slate-950" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Admin Control Panel</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminUsers}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A3658] bg-[#1A2235] px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#00D4AA]" /> Refresh Users
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A3658] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-extrabold text-amber-400 mb-2">
              <Users className="h-3.5 w-3.5" />
              <span>User & Trial Management</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              View all trial accounts, expiry dates, convert users to Premium, or manually extend trial durations.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex gap-4">
            <div className="rounded-xl border border-[#2A3658] bg-[#121826] px-4 py-3 text-center min-w-[120px]">
              <span className="text-2xl font-extrabold text-white block">{users.length}</span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Users</span>
            </div>
            <div className="rounded-xl border border-[#6C63FF]/40 bg-[#6C63FF]/10 px-4 py-3 text-center min-w-[120px]">
              <span className="text-2xl font-extrabold text-[#6C63FF] block">
                {users.filter((u) => u.isTrial && u.daysRemaining > 0).length}
              </span>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Trials</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#2A3658] bg-[#121826] pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:border-[#6C63FF] focus:outline-none"
          />
        </div>

        {/* Users Table (Requirement 11) */}
        <div className="rounded-2xl border border-[#2A3658] bg-[#121826] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2A3658] bg-[#1A2235] text-slate-300 uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="px-6 py-4">User Email</th>
                  <th className="px-6 py-4">Plan Status</th>
                  <th className="px-6 py-4">Expiry Date (DD/MM/YYYY)</th>
                  <th className="px-6 py-4">Days Remaining</th>
                  <th className="px-6 py-4">Reminders Sent</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A3658]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                      Loading registered user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                      No user accounts found matching "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.userEmail} className="hover:bg-[#1A2235]/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <div className="grid h-7 w-7 place-items-center rounded-full bg-[#6C63FF] text-white font-bold">
                          {u.userEmail.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.userEmail}</span>
                      </td>

                      <td className="px-6 py-4">
                        {u.plan === "premium_plus" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-400">
                            <Zap className="h-3 w-3 fill-emerald-400" /> Premium Plan
                          </span>
                        ) : u.isTrial && u.daysRemaining > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6C63FF]/40 bg-[#6C63FF]/15 px-3 py-1 text-[11px] font-extrabold text-[#6C63FF]">
                            <Sparkles className="h-3 w-3 text-[#00D4AA]" /> Free Trial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5C7C]/40 bg-[#FF5C7C]/10 px-3 py-1 text-[11px] font-extrabold text-[#FF5C7C]">
                            Expired
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-extrabold text-[#00D4AA] flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#00D4AA]" />
                        {formatDDMMYYYY(u.expiryDate)}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-200">
                        {u.daysRemaining > 0 ? `${u.daysRemaining} Days` : "0 Days (Expired)"}
                      </td>

                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {u.remindersSent.length > 0 ? u.remindersSent.join(", ") : "None"}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Convert to Premium Button */}
                        <button
                          onClick={() => handleConvertUser(u.userEmail)}
                          disabled={actionLoading === `convert_${u.userEmail}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#00D4AA] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-md hover:opacity-95 disabled:opacity-50 transition-all"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Convert to Premium
                        </button>

                        {/* Extend Trial (+7 Days) Button */}
                        <button
                          onClick={() => handleExtendTrial(u.userEmail, 7)}
                          disabled={actionLoading === `extend_${u.userEmail}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#2A3658] bg-[#1A2235] px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-white/10 disabled:opacity-50 transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5 text-amber-400" /> +7 Days
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
