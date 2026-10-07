import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
  UserPlus,
  Clock,
  CheckCircle2,
  Lock,
  LogOut,
  Loader2,
  Activity,
  Layers,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { UserAccountsPanel } from "@/components/admin/UserAccountsPanel";
import { PendingApprovalsPanel } from "@/components/admin/PendingApprovalsPanel";
import {
  adminVerifyLogin,
  adminListUserAccounts,
  parseAdminCredential,
  ADMIN_STORAGE_KEY,
  type AdminRole,
} from "@/lib/orders.functions";
import { adminListPendingApprovals } from "@/lib/farm.functions";

export const Route = createFileRoute("/admin/user-accounts")({
  head: () => ({
    meta: [
      { title: "User Accounts & Role Management · Dignity Agro Farms" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UserAccountsPage,
});

function UserAccountsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verifyLoginFn = useServerFn(adminVerifyLogin);
  const listAccountsFn = useServerFn(adminListUserAccounts);
  const listPendingFn = useServerFn(adminListPendingApprovals);

  const [mounted, setMounted] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [username, setUsername] = useState("");
  const [inputPasscode, setInputPasscode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<"accounts" | "approvals">("accounts");

  // Load session credentials from localStorage on mount (prevents SSR hydration error #418)
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedPasscode =
        localStorage.getItem(ADMIN_STORAGE_KEY) ||
        localStorage.getItem("daf_admin_passcode") ||
        localStorage.getItem("agrofarms_admin_passcode") ||
        "";

      if (savedPasscode) {
        setPasscode(savedPasscode);
      }
    }
  }, []);

  // Verify passcode & get current user role
  const verifyQuery = useQuery({
    queryKey: ["admin-verify-accounts", passcode],
    queryFn: async () => {
      if (!passcode) throw new Error("No passcode");
      const cred = parseAdminCredential(passcode);
      return verifyLoginFn({ data: { username: cred.username, passcode: cred.passcode } });
    },
    enabled: Boolean(passcode) && mounted,
    staleTime: 60 * 1000,
  });

  const role: AdminRole = verifyQuery.data?.role || "owner";

  // Fetch accounts overview for KPI stats
  const accountsQuery = useQuery({
    queryKey: ["admin-user-accounts-kpi", passcode],
    queryFn: () => listAccountsFn({ data: { passcode } }),
    enabled: Boolean(passcode) && verifyQuery.isSuccess && mounted,
  });

  // Fetch pending approvals count
  const pendingQuery = useQuery({
    queryKey: ["pending-approvals-kpi", passcode],
    queryFn: () => listPendingFn({ data: { passcode } }),
    enabled: Boolean(passcode) && role === "owner" && verifyQuery.isSuccess && mounted,
    refetchInterval: 15000,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPasscode.trim()) return;

    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await verifyLoginFn({
        data: {
          username: username.trim().toLowerCase() || "owner",
          passcode: inputPasscode.trim(),
        },
      });

      if (!res.ok) {
        setAuthError("Invalid username or passcode.");
        setIsLoggingIn(false);
        return;
      }

      queryClient.clear();
      const sessionToken = username.trim()
        ? JSON.stringify({ username: username.trim().toLowerCase(), passcode: inputPasscode.trim() })
        : inputPasscode.trim();

      localStorage.setItem(ADMIN_STORAGE_KEY, sessionToken);
      localStorage.setItem("daf_admin_passcode", sessionToken);
      localStorage.setItem("agrofarms_admin_passcode", sessionToken);

      setPasscode(sessionToken);
    } catch (err: any) {
      setAuthError(err?.message || "Login failed. Please check credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem("daf_admin_passcode");
    localStorage.removeItem("agrofarms_admin_passcode");
    localStorage.removeItem("agrofarms_admin_user");
    queryClient.clear();
    setPasscode("");
  };

  const accounts = accountsQuery.data || [];
  const pendingCount = (pendingQuery.data?.financials?.length || 0) + (pendingQuery.data?.activities?.length || 0);

  const ownerCount = accounts.filter((a) => a.role === "owner").length;
  const managerCount = accounts.filter((a) => a.role === "manager").length;
  const staffCount = accounts.filter((a) => a.role === "staff").length;

  // Prevent SSR Hydration Mismatch Error #418
  if (!mounted) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-[#FDFBF7] py-12 flex items-center justify-center">
          <div className="flex items-center space-x-3 text-[#0F3D24]">
            <Loader2 className="w-6 h-6 animate-spin text-[#3F8F3F]" />
            <span className="text-sm font-semibold">Loading user accounts portal...</span>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="min-h-screen bg-[#FDFBF7] py-8 text-[#0F3D24]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top Bar Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
            <div className="flex items-center space-x-4">
              <Link
                to="/admin/admin-orders"
                className="flex items-center gap-2 rounded-xl bg-[#F7F5F0] px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24]/10 transition"
              >
                <ArrowLeft size={16} />
                Back to Admin Dashboard
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Users className="text-[#3F8F3F]" size={24} />
                  User Accounts & Access Control
                </h1>
                <p className="text-xs text-[#0F3D24]/70">
                  Manage admin, manager, and staff accounts, permissions, and pending approvals.
                </p>
              </div>
            </div>

            {passcode && verifyQuery.isSuccess && (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-[#3F8F3F]/10 px-3 py-1.5 text-xs font-bold text-[#0F3D24]">
                  Role: <strong className="ml-1 capitalize">{role}</strong>
                </span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Unauthenticated Login Card */}
          {!passcode || verifyQuery.isError ? (
            <div className="mx-auto max-w-md my-12 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#3F8F3F] flex items-center justify-center mx-auto">
                <ShieldCheck size={28} />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold">Admin Authentication</h2>
                <p className="text-xs text-[#0F3D24]/70 mt-1">
                  Enter your admin credentials to access user account management.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Username (Optional for Owner)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. manager_1 or staff_sam"
                    className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Passcode / Password *</label>
                  <input
                    type="password"
                    value={inputPasscode}
                    onChange={(e) => setInputPasscode(e.target.value)}
                    placeholder="Enter passcode"
                    className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                  />
                </div>

                {authError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-[#0F3D24] hover:bg-[#134a2c] text-white font-bold rounded-xl text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Access Accounts</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Stat Cards Overview */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
                  <div className="flex items-center justify-between text-[#0F3D24]/70">
                    <span className="text-xs font-semibold">Total Accounts</span>
                    <div className="rounded-full bg-emerald-50 p-2 text-emerald-600">
                      <Users size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-[#0F3D24]">{accounts.length}</p>
                  <span className="mt-1 block text-xs text-[#0F3D24]/60">
                    {ownerCount} Owner • {managerCount} Manager • {staffCount} Staff
                  </span>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
                  <div className="flex items-center justify-between text-[#0F3D24]/70">
                    <span className="text-xs font-semibold">Managers & Staff</span>
                    <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                      <UserPlus size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-blue-700">{managerCount + staffCount}</p>
                  <span className="mt-1 block text-xs text-[#0F3D24]/60">Role-restricted access levels</span>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-amber-500">
                  <div className="flex items-center justify-between text-[#0F3D24]/70">
                    <span className="text-xs font-semibold">Pending Approvals</span>
                    <div className="rounded-full bg-amber-50 p-2 text-amber-600">
                      <Clock size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-amber-600">{pendingCount}</p>
                  <span className="mt-1 block text-xs text-[#0F3D24]/60">
                    {pendingCount > 0 ? "Staff inputs awaiting review" : "All staff records approved"}
                  </span>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
                  <div className="flex items-center justify-between text-[#0F3D24]/70">
                    <span className="text-xs font-semibold">Account Security</span>
                    <div className="rounded-full bg-purple-50 p-2 text-purple-600">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-bold text-purple-700">BCrypt / SHA-256</p>
                  <span className="mt-1 block text-xs text-[#0F3D24]/60">Secured with salt hashing</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#0F3D24]/10 space-x-4">
                <button
                  onClick={() => setActiveTab("accounts")}
                  className={`pb-3 px-2 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                    activeTab === "accounts"
                      ? "border-[#3F8F3F] text-[#0F3D24]"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Users size={16} />
                  <span>User Accounts & Passcodes</span>
                </button>

                {role === "owner" && (
                  <button
                    onClick={() => setActiveTab("approvals")}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors relative ${
                      activeTab === "approvals"
                        ? "border-[#3F8F3F] text-[#0F3D24]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <ShieldAlert size={16} />
                    <span>Pending Staff Approvals</span>
                    {pendingCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Tab Contents */}
              {activeTab === "accounts" ? (
                <UserAccountsPanel
                  passcode={passcode}
                  role={role}
                  onPasscodeChanged={(newPasscode) => {
                    const cred = parseAdminCredential(passcode);
                    const updatedToken = JSON.stringify({ username: cred.username, passcode: newPasscode });
                    localStorage.setItem(ADMIN_STORAGE_KEY, updatedToken);
                    localStorage.setItem("daf_admin_passcode", updatedToken);
                    setPasscode(updatedToken);
                  }}
                />
              ) : (
                <PendingApprovalsPanel passcode={passcode} role={role} />
              )}
            </>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
