import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Handshake,
  Lock,
  User,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Receipt,
  Activity,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  PhoneCall,
  MessageCircle,
  Eye,
  Building,
} from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import {
  partnerVerifyLogin,
  partnerGetMyDashboard,
  type PartnerDashboardData,
} from "@/lib/partners.functions";

const naira = (n: number) => "\u20a6" + (n || 0).toLocaleString("en-NG");
const PARTNER_STORAGE_KEY = "daf_partner_credential";

export const Route = createFileRoute("/for-partners")({
  head: () => ({
    meta: [
      { title: "For Partners & Investors | Dignity Agro Farms" },
      {
        name: "description",
        content:
          "Partner with Dignity Agro Farms. Access your transparent Partners Account for live investment updates, daily farm activities, and itemized financial tracking.",
      },
      { property: "og:title", content: "For Partners & Investors | Dignity Agro Farms" },
      {
        property: "og:description",
        content:
          "Transparent agribusiness partnerships in Owerri. Live farm logs, itemized financials, and daily activity tracking for investors.",
      },
    ],
    links: [{ rel: "canonical", href: "/for-partners" }],
  }),
  component: ForPartnersPage,
});

function ForPartnersPage() {
  const [partnerAuth, setPartnerAuth] = useState<{
    username: string;
    passcode: string;
    fullName?: string;
  } | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Read stored partner session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.username && parsed.passcode) {
            setPartnerAuth(parsed);
          }
        }
      } catch {
        // ignore parse error
      }
      setAuthInitialized(true);
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(PARTNER_STORAGE_KEY);
    }
    setPartnerAuth(null);
  };

  const handleLoginSuccess = (cred: { username: string; passcode: string; fullName: string }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(cred));
    }
    setPartnerAuth(cred);
  };

  return (
    <SiteLayout>
      <div className="min-h-[calc(100vh-140px)] bg-[#F7F5F0]/60 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {partnerAuth ? (
            <PartnersAccountPortal
              auth={partnerAuth}
              onLogout={handleLogout}
            />
          ) : (
            <PublicPartnersLanding onLoginSuccess={handleLoginSuccess} />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

// ─── PUBLIC PARTNERS LANDING & LOGIN ──────────────────────────────────────────

function PublicPartnersLanding({
  onLoginSuccess,
}: {
  onLoginSuccess: (cred: { username: string; passcode: string; fullName: string }) => void;
}) {
  const verifyLoginFn = useServerFn(partnerVerifyLogin);

  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !passcode.trim()) {
      setErrorMsg("Please enter your username and passcode.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await verifyLoginFn({
        data: {
          username: username.trim().toLowerCase(),
          passcode: passcode.trim(),
        },
      });
      onLoginSuccess({
        username: res.username,
        passcode: passcode.trim(),
        fullName: res.fullName,
      });
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid username or passcode.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3F8F3F]/15 px-4 py-1 text-xs font-extrabold uppercase tracking-widest text-[#0F3D24]">
          <Handshake size={14} className="text-[#3F8F3F]" /> Dignity Agro Farms Partnership Program
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-[#0F3D24] tracking-tight font-display">
          Agribusiness Partnerships with <br />
          <span className="text-[#3F8F3F]">100% Live Transparency</span>
        </h1>
        <p className="text-sm sm:text-base text-[#0F3D24]/80 leading-relaxed">
          We believe investor confidence is built on honesty and complete visibility. Every partner receives a dedicated <strong>Partners Account</strong> to track stock arrivals, daily feed records, mortality logs, and itemized financial statements in real time.
        </p>
      </div>

      {/* Main Grid: Login Card + Why Partner With Us */}
      <div className="grid gap-8 lg:grid-cols-12 items-start max-w-5xl mx-auto">
        {/* Left: Partner Portal Login Card */}
        <div className="lg:col-span-6 rounded-3xl bg-white p-6 sm:p-8 shadow-xl ring-1 ring-[#0F3D24]/10 space-y-6">
          <div className="space-y-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F3D24] text-white">
              <Lock size={20} />
            </div>
            <h2 className="text-xl font-black text-[#0F3D24] pt-2">Partner Portal Login</h2>
            <p className="text-xs text-slate-500">
              Sign in to your transparent Partners Account to inspect your live farm investment.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Partner Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. emeka_okafor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 pl-9 pr-3.5 py-3 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                />
                <User size={15} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Account Passcode / Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 pl-9 pr-3.5 py-3 text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                />
                <Lock size={15} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0F3D24] py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-[#165232] disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Verifying Access...
                </span>
              ) : (
                "Open Partners Account →"
              )}
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Forgot your credentials? Contact Dignity Agro Farms administration at{" "}
              <a href="tel:+2348167099492" className="font-bold text-[#3F8F3F] underline">
                081 6709 9492
              </a>
            </p>
          </div>
        </div>

        {/* Right: The 3 Pillars of Farm Transparency */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl bg-[#0F3D24] p-6 sm:p-7 text-white shadow-md space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#a8e6a8]">
              The Transparency Guarantee
            </span>
            <h3 className="text-xl font-black">How Dignity Agro Farms Partners Invest</h3>
            <p className="text-xs text-white/80 leading-relaxed">
              We eliminate guesswork. When you co-finance a broiler cycle or farm expansion, your capital is tied to measurable farm assets with real-time logging.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <Receipt size={18} />
              </div>
              <h4 className="text-sm font-bold text-[#0F3D24]">Itemized Financials</h4>
              <p className="text-xs text-slate-600">
                Inspect every naira spent on Day-Old Chicks, starter feed, vaccines, and offload sales.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Activity size={18} />
              </div>
              <h4 className="text-sm font-bold text-[#0F3D24]">Live Activity Logs</h4>
              <p className="text-xs text-slate-600">
                Daily records of feed consumption, flock weights, and health status direct from our farm pens.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <TrendingUp size={18} />
              </div>
              <h4 className="text-sm font-bold text-[#0F3D24]">Reliable Agribusiness ROI</h4>
              <p className="text-xs text-slate-600">
                Target returns backed by proven broiler management, farm bio-security, and direct market offload.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                <ShieldCheck size={18} />
              </div>
              <h4 className="text-sm font-bold text-[#0F3D24]">Strict Data Privacy</h4>
              <p className="text-xs text-slate-600">
                Your investment details and returns are private to you and accessible solely via your secure login.
              </p>
            </div>
          </div>

          {/* Prospective Partner Inquiry Call to Action */}
          <div className="rounded-2xl bg-[#3F8F3F]/10 border border-[#3F8F3F]/20 p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <h4 className="text-sm font-bold text-[#0F3D24]">Interested in Becoming a Partner?</h4>
              <p className="text-xs text-slate-600">Speak with our farm management about upcoming poultry cycles.</p>
            </div>
            <a
              href="https://wa.me/2348167099492?text=Hello%20Dignity%20Agro%20Farms,%20I%20am%20interested%20in%20becoming%20an%20agribusiness%20partner."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1eb856] transition whitespace-nowrap"
            >
              <MessageCircle size={15} /> WhatsApp Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PARTNERS ACCOUNT PORTAL (TRANSPARENT INVESTOR VIEW) ──────────────────────

function PartnersAccountPortal({
  auth,
  onLogout,
}: {
  auth: { username: string; passcode: string; fullName?: string };
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"financials" | "activities">("financials");

  const getDashboardFn = useServerFn(partnerGetMyDashboard);
  const dashboardQuery = useQuery({
    queryKey: ["partner-dashboard", auth.username, auth.passcode],
    queryFn: () =>
      getDashboardFn({
        data: {
          username: auth.username,
          passcode: auth.passcode,
        },
      }),
    refetchInterval: 30_000,
  });

  if (dashboardQuery.isLoading) {
    return (
      <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
        <Loader2 className="mx-auto animate-spin text-[#3F8F3F]" size={40} />
        <h3 className="mt-4 text-base font-bold text-[#0F3D24]">Loading Your Partners Account...</h3>
        <p className="text-xs text-slate-500">Retrieving live investment records from Dignity Agro Farms.</p>
      </div>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-sm max-w-lg mx-auto space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Authentication Required</h3>
        <p className="text-xs text-slate-600">
          {dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Could not authenticate your partner session. Please log in again."}
        </p>
        <button
          onClick={onLogout}
          className="rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#165232]"
        >
          Return to Login
        </button>
      </div>
    );
  }

  const { partner, financials, activities, summary } = dashboardQuery.data;

  return (
    <div className="space-y-6">
      {/* Top Welcome Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-gradient-to-r from-[#0F3D24] via-[#165232] to-[#0F3D24] p-6 sm:p-8 text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#a8e6a8]">
              <Handshake size={18} />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#a8e6a8]">
              Partners Account · Transparency Portal
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{partner.fullName}</h2>
          <p className="text-xs text-white/80">
            Project: <strong className="text-white">{partner.projectName}</strong> · Investment Date: {partner.investmentDate}
            {partner.batchName && ` · Farm Batch: ${partner.batchName}`}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <span className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-white/20">
            ● Live Investment Active
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white hover:bg-white/25 transition backdrop-blur-sm"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Capital Invested
            </span>
            <div className="rounded-xl bg-[#0F3D24]/10 p-2 text-[#0F3D24]">
              <Wallet size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0F3D24]">{naira(summary.totalInvested)}</div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {partner.targetRoiPercentage > 0 ? `Target Return: +${partner.targetRoiPercentage}%` : "Co-financing slot"}
          </span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Live Birds on Farm
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-900">{summary.currentStockCount.toLocaleString()} birds</div>
          <span className="text-[10px] text-slate-500 font-semibold">
            Mortality: {summary.totalMortalityCount} birds · Feed: {summary.totalFeedConsumedKg}kg
          </span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Itemized Expenses
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-900">{naira(summary.totalExpenses)}</div>
          <span className="text-[10px] text-slate-500 font-semibold">DOCs, Feed, Vaccines, Operations</span>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Sales & Inflows Keyed
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">{naira(summary.totalIncome)}</div>
          <span className="text-[10px] text-slate-500 font-semibold">
            Net Return: {summary.netBalance >= 0 ? "+" : ""}{naira(summary.netBalance)}
          </span>
        </div>
      </div>

      {/* Agreed Contract Terms Banner */}
      {partner.agreedTerms && (
        <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-4 sm:p-5 flex items-start gap-3">
          <ShieldCheck className="shrink-0 text-[#3F8F3F] mt-0.5" size={20} />
          <div className="text-xs space-y-1">
            <span className="font-extrabold uppercase tracking-wider text-[#0F3D24]">Agreed Partnership Terms</span>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{partner.agreedTerms}</p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-6">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("financials")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
              activeTab === "financials"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Receipt size={15} /> Itemized Financial Statements ({financials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
              activeTab === "activities"
                ? "border-[#0F3D24] text-[#0F3D24]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity size={15} /> Daily Farm Activities & Stock Logs ({activities.length})
          </button>
        </div>

        {/* Tab 1: Financial Statements */}
        {activeTab === "financials" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-[#0F3D24]">Itemized Investment Ledger</h3>
                <p className="text-xs text-slate-500">
                  Every single expense and sales transaction attributed to your investment.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-bold text-rose-800">
                  Total Costs: {naira(summary.totalExpenses)}
                </span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-bold text-emerald-800">
                  Total Sales: {naira(summary.totalIncome)}
                </span>
              </div>
            </div>

            {financials.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-500">
                No financial entries have been keyed in yet for this cycle. Farm management will log entries as expenses are incurred and birds are sold.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Payment Method</th>
                      <th className="py-3 px-3 text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financials.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                          {row.transactionDate}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              row.type === "expense" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {row.type === "expense" ? "Expense" : "Income / Sale"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#0F3D24]">{row.category}</td>
                        <td className="py-3 px-3 text-slate-700 max-w-sm">
                          {row.description}
                          {row.referenceNo && (
                            <span className="block text-[10px] text-slate-400 font-mono">Ref: {row.referenceNo}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{row.paymentMethod}</td>
                        <td
                          className={`py-3 px-3 text-right font-black ${
                            row.type === "expense" ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {row.type === "expense" ? "-" : "+"}
                          {naira(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Daily Farm Activities */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-[#0F3D24]">Daily Pen Logs & Stock Activity</h3>
              <p className="text-xs text-slate-500">
                Direct updates recorded by farm supervisors for your investment flock.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-500">
                No activity logs have been recorded for this cycle yet. Daily updates will appear here once flock operations commence.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="rounded-2xl border border-slate-200 bg-[#F7F5F0]/40 p-4 space-y-2 hover:bg-[#F7F5F0]/80 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{act.activityDate}</span>
                        <span className="inline-flex items-center rounded-full bg-[#3F8F3F]/15 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F3D24]">
                          {act.activityType}
                        </span>
                        {act.mortalityCount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-800">
                            {act.mortalityCount} Mortality
                          </span>
                        )}
                        {act.stockHeadcount > 0 && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                            +{act.stockHeadcount} Birds Received
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">Recorded by Farm Management</span>
                    </div>

                    {act.notes && <p className="text-xs font-medium text-slate-800">{act.notes}</p>}

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
                      {act.feedConsumedKg > 0 && (
                        <span>
                          Feed Consumed: <strong>{act.feedConsumedKg} kg</strong>
                        </span>
                      )}
                      {act.averageWeightKg > 0 && (
                        <span>
                          Flock Avg Weight: <strong>{act.averageWeightKg} kg</strong>
                        </span>
                      )}
                      {act.causeOfMortality && (
                        <span className="text-rose-700">Suspected Cause: {act.causeOfMortality}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
