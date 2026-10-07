import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCw, ShieldCheck, MessageCircle, MessageSquare, CheckCircle2, XCircle, Clock, Download, FileText, Search, Ban, AlertTriangle, FileArchive, Users, TicketPercent, Copy, ImageDown, Share2, Sparkles, X, Pencil, Trash2, Gift, Loader2, TrendingUp, Activity, UserPlus, ChevronDown, ChevronUp, Bell, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { PwaInstallPrompt } from "@/components/site/PwaInstallPrompt";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import { receiptHtml, preorderPaymentReceiptHtml, preorderCompleteReceiptHtml } from "@/lib/receipt-html";
import { adminListOrders, adminUpdateOrder, adminDecidePayment, adminGetPasscode, adminSetPasscode, adminListClients, adminListVouchers, adminCreateVoucher, adminToggleVoucher, adminUpdateVoucher, adminDeleteVoucher, adminCorrectOrder, adminDeleteOrder, adminAssignOrderBatch, type AdminOrder, type ClientRecord, type AdminVoucher, type AdminRole } from "@/lib/orders.functions";
import { adminListPreorders, adminGetPreorderDetail, adminConfirmPreorderPayment, adminDeletePreorderPayment, adminUpdatePreorderDelivery, adminAddPreorderPayment, adminListPendingPayments, adminDeletePreorder, adminCorrectPreorder, adminAssignPreorderBatch, type Preorder, type PreorderPayment } from "@/lib/preorders.functions";
import { adminListBatches, type FarmBatch } from "@/lib/farm.functions";
import { downloadPdf } from "@/lib/pdf";
import { BatchFinancialsPanel, LeadCrmPanel, DailyActivitiesPanel } from "@/components/admin/FarmManagementPanels";
import { OrganizedOrdersList } from "@/components/admin/OrganizedOrdersList";
import { ReminderModal } from "@/components/admin/ReminderModal";
import { UserAccountsPanel } from "@/components/admin/UserAccountsPanel";
import { PasswordRecoveryModal } from "@/components/admin/PasswordRecoveryModal";
import { FlyerGeneratorModal, type FlyerOrderData } from "@/components/admin/FlyerGeneratorModal";

export const Route = createFileRoute("/admin/admin-orders")({
  head: () => ({
    meta: [
      { title: "Admin Orders · Dignity Agro Farms" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrders,
});


function PasscodePanel({ passcode, onChanged }: { passcode: string; onChanged: (next: string) => void }) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const getFn = useServerFn(adminGetPasscode);
  const setFn = useServerFn(adminSetPasscode);

  const reveal = useMutation({
    mutationFn: () => getFn({ data: { passcode } }),
    onSuccess: (r) => setRevealed(r.current),
    onError: (e: Error) => setMsg(e.message),
  });

  const save = useMutation({
    mutationFn: () => setFn({ data: { passcode, newPasscode: next.trim() } }),
    onSuccess: () => {
      setMsg("Passcode updated. Keep it somewhere safe.");
      onChanged(next.trim());
      setRevealed(next.trim());
      setNext("");
      setConfirm("");
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const canSave = next.trim().length >= 6 && next.trim() === confirm.trim();

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-[#0F3D24]">
        <ShieldCheck size={18} className="text-[#3F8F3F]" /> Staff passcode
      </h2>
      <p className="mt-1 text-sm text-[#0F3D24]/70">
        Review the passcode currently in use, or set a new one. If you ever forget it, sign in with the farm's permanent master passcode and set a new one here.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => reveal.mutate()}
          className="rounded-full bg-[#0F3D24]/5 px-4 py-2 text-xs font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/10"
        >
          {reveal.isPending ? "Checking…" : "Show current passcode"}
        </button>
        {revealed && <code className="rounded-lg bg-[#F7F5F0] px-3 py-2 font-mono text-sm">{revealed}</code>}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New passcode (min 6 characters)"
          className="rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
        />
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new passcode"
          className="rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
        />
        <button
          disabled={!canSave || save.isPending}
          onClick={() => save.mutate()}
          className="rounded-full bg-[#3F8F3F] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Update passcode"}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-[#0F3D24]/80">{msg}</p>}
    </div>
  );
}

const STATUS_OPTIONS: { value: AdminOrder["status"]; label: string }[] = [
  { value: "received", label: "Received" },
  { value: "preparing", label: "Being Prepared" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");
const STORAGE_KEY = "daf_admin_passcode";

// An order that was started but never paid for, with no activity for 24h+.
function isNotCompleted(o: AdminOrder): boolean {
  if (o.status === "cancelled" || o.status === "delivered") return false;
  if (o.paymentStatus !== "pending" && o.paymentStatus !== "rejected") return false;
  return Date.now() - new Date(o.updatedAt).getTime() > 24 * 60 * 60 * 1000;
}

const STATUS_MESSAGES: Record<AdminOrder["status"], (o: AdminOrder) => string> = {
  received: (o) =>
    `Hi ${o.customerName.split(" ")[0]}, this is Dignity Agro Farms. We've received your order ${o.orderCode} (total ${naira(o.total)}). We'll start preparing it shortly.`,
  preparing: (o) =>
    `Hi ${o.customerName.split(" ")[0]}, your order ${o.orderCode} is now being prepared at the farm.${o.eta ? ` ETA: ${o.eta}.` : ""}${o.statusNote ? ` Note: ${o.statusNote}` : ""}`,
  out_for_delivery: (o) =>
    `Hi ${o.customerName.split(" ")[0]}, good news! Your order ${o.orderCode} is now OUT FOR DELIVERY.${o.eta ? ` ETA: ${o.eta}.` : ""}${o.statusNote ? ` ${o.statusNote}` : ""} Thank you!`,
  delivered: (o) =>
    `Hi ${o.customerName.split(" ")[0]}, your order ${o.orderCode} has been delivered. Thank you for choosing Dignity Agro Farms. We'd love to serve you again!`,
  cancelled: (o) =>
    `Hi ${o.customerName.split(" ")[0]}, your order ${o.orderCode} has been cancelled.${o.statusNote ? ` Reason: ${o.statusNote}` : ""} Please contact us on 08167099492 if you have questions.`,
};

function waLink(order: AdminOrder, overrides?: Partial<Pick<AdminOrder, "status" | "statusNote" | "eta">>): string {
  const merged = { ...order, ...overrides } as AdminOrder;
  const digits = merged.phone.replace(/\D+/g, "");
  const text = encodeURIComponent(STATUS_MESSAGES[merged.status](merged));
  return `https://wa.me/${digits}?text=${text}`;
}

// Plain SMS thank-you sent to the customer's phone once an order is delivered.
function thankYouSms(order: AdminOrder): string {
  const first = order.customerName.split(" ")[0];
  const body =
    `Hi ${first}, your order ${order.orderCode} has been delivered. ` +
    `Thank you for patronising Dignity Agro Farms. We hope you enjoy your farm-fresh order, and we'd love to serve you again! 081 6709 9492`;
  return `sms:+${order.phone.replace(/\D+/g, "")}?&body=${encodeURIComponent(body)}`;
}

const STATUS_LABEL: Record<AdminOrder["status"], string> = {
  received: "Order received",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function paymentWaLink(order: AdminOrder, decision: "approved" | "rejected", reason?: string): string {
  const digits = order.phone.replace(/\D+/g, "");
  const first = order.customerName.split(" ")[0];
  const text =
    decision === "approved"
      ? `Hi ${first}, this is Dignity Agro Farms. Your payment of ${naira(order.total)} for order ${order.orderCode} has been CONFIRMED.\nCurrent status: ${STATUS_LABEL[order.status]}.${order.eta ? ` ETA: ${order.eta}.` : ""}\nTrack your order anytime on our website with your tracking code ${order.trackCode}. Thank you!`
      : `Hi ${first}, this is Dignity Agro Farms. We could not confirm your payment of ${naira(order.total)} for order ${order.orderCode}.${reason ? ` Reason: ${reason}.` : ""}\nCurrent status: ${STATUS_LABEL[order.status]}.\nPlease send payment to 4006179439 (Moniepoint MFB · Dignity Agro Farms Limited) only, then tap "I have made payment" again. Call 08167099492 for help.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function AdminOrders() {
  const [passcode, setPasscode] = useState<string | null>(() => (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null));
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [input, setInput] = useState("");
  const [username, setUsername] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"awaiting" | "all" | "cancelled_customer" | "cancelled_admin" | "not_completed">("awaiting");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showFlyerModal, setShowFlyerModal] = useState(false);
  const [selectedFlyerOrder, setSelectedFlyerOrder] = useState<FlyerOrderData | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "financials" | "activities" | "clients" | "leads" | "vouchers" | "flyers" | "december">("orders");
  const [applied, setApplied] = useState({ from: "", to: "", status: "", paymentStatus: "", zone: "", search: "" });
  const listFn = useServerFn(adminListOrders);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-orders", passcode, applied],
    queryFn: () => listFn({ data: { passcode: passcode!, ...applied } }),
    enabled: !!passcode,
    refetchInterval: 20000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  const listBatchesFn = useServerFn(adminListBatches);
  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode: passcode! } }),
    enabled: !!passcode,
    placeholderData: (previousData) => previousData,
  });

  const signOut = () => {
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setPasscode(null);
    qc.removeQueries({ queryKey: ["admin-orders"] });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let throttleTimeout: NodeJS.Timeout | null = null;

    const checkSession = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.loginAt) {
          parsed.loginAt = Date.now();
          parsed.lastActive = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }

        const now = Date.now();
        // If we have query.data.role use it, else guess based on username
        const role = query.data?.role || (parsed.username === "staff" ? "staff" : "owner");

        if (role === "owner") {
          // Admin absolute expiry 24 hours
          if (now - parsed.loginAt > 24 * 60 * 60 * 1000) {
            signOut();
            return;
          }
        } else {
          // Staff idle expiry 7 hours
          if (now - parsed.lastActive > 7 * 60 * 60 * 1000) {
            signOut();
            return;
          }
        }
        setPasscode(saved);
      } catch {
        // Fallback for old plaintext passcodes
        const migrated = JSON.stringify({ username: "unknown", passcode: saved, loginAt: Date.now(), lastActive: Date.now() });
        localStorage.setItem(STORAGE_KEY, migrated);
        setPasscode(migrated);
      }
    };

    const updateActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => { throttleTimeout = null; }, 5000);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.lastActive = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch { /* ignore */ }
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 60000);

    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("click", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });

    return () => {
      clearInterval(interval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
    };
  }, [query.data?.role, qc]);



  const applyFilters = () => {
    setApplied({ from, to, status: statusFilter, paymentStatus: payFilter, zone: zoneFilter, search: search.trim() });
  };

  const setRange = (days: number | "month") => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const start = days === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getTime() - (days - 1) * 86400000);
    setFrom(iso(start));
    setTo(iso(now));
    setApplied({ from: iso(start), to: iso(now), status: statusFilter, paymentStatus: payFilter, zone: zoneFilter, search: search.trim() });
  };

  const resetFilters = () => {
    setFrom(""); setTo(""); setStatusFilter(""); setPayFilter(""); setZoneFilter(""); setSearch("");
    setReasonFilter("");
    setApplied({ from: "", to: "", status: "", paymentStatus: "", zone: "", search: "" });
  };

  useEffect(() => {
    if (query.error && passcode) {
      const errMsg = (query.error as Error).message || "";
      if (errMsg.includes("UNAUTHORIZED") || errMsg.includes("Invalid passcode") || errMsg.includes("Invalid credential")) {
        setAuthError(errMsg);
        localStorage.removeItem(STORAGE_KEY);
        setPasscode(null);
        qc.removeQueries({ queryKey: ["admin-orders"] });
      }
    }
  }, [query.error, passcode, qc]);



  const submitPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const p = input;
    const u = username.trim().toLowerCase();
    if (!u || !p) return;

    setIsLoggingIn(true);
    setTimeout(() => {
      const credential = JSON.stringify({ username: u, passcode: p, loginAt: Date.now(), lastActive: Date.now() });
      localStorage.setItem(STORAGE_KEY, credential);
      setPasscode(credential);
      setInput("");
      setUsername("");
      setIsLoggingIn(false);
    }, 400);
  };

  return (
    <SiteLayout>
      {passcode && <PwaInstallPrompt />}
      <section className="bg-[#0F3D24] py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Owner and staff portal</span>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Order Management</h1>
          </div>
          {passcode && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  if (!('Notification' in window)) {
                    alert("Browser notifications are not supported on this device.");
                    return;
                  }
                  const perm = await Notification.requestPermission();
                  if (perm === 'granted') {
                    alert("✅ Phone & Browser Push Notifications Enabled! You will receive live order alerts.");
                  } else {
                    alert("Notification permission was denied. Enable notifications in your browser settings.");
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/30 transition"
              >
                <Bell size={14} /> Push Alerts
              </button>
              <button
                onClick={() => { setSelectedFlyerOrder(null); setShowFlyerModal(true); }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
              >
                <Sparkles size={14} /> Flyer Generator
              </button>
              <button onClick={() => setShowSettings((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20 transition">
                <ShieldCheck size={14} /> User Accounts & Passcodes
              </button>
              <button onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20 transition">
                <RefreshCw size={14} /> Refresh
              </button>
              <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20 transition">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {passcode && showSettings && (
          <UserAccountsPanel
            passcode={passcode}
            role={query.data?.role || "owner"}
            onPasscodeChanged={(next) => {
              const u = parseAdminCredential(passcode).username;
              const credential = JSON.stringify({ username: u, passcode: next, loginAt: Date.now(), lastActive: Date.now() });
              localStorage.setItem(STORAGE_KEY, credential);
              setPasscode(credential);
            }}
          />
        )}
        {passcode && (
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">Admin Navigation & Controls</span>
              {query.data?.role && (
                <span className="inline-flex items-center rounded-full bg-[#3F8F3F]/10 px-3 py-1 text-xs font-bold text-[#0F3D24]">
                  Signed in as {query.data.role}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8" role="tablist" aria-label="Admin sections">
              <AdminTab active={activeTab === "orders"} onClick={() => setActiveTab("orders")} icon={<FileText size={15} />}>Orders & reports</AdminTab>
              <AdminTab active={activeTab === "financials"} onClick={() => setActiveTab("financials")} icon={<TrendingUp size={15} />}>Batches & Financials</AdminTab>
              <AdminTab active={activeTab === "activities"} onClick={() => setActiveTab("activities")} icon={<Activity size={15} />}>Daily Activities & Mortality</AdminTab>
              <AdminTab active={activeTab === "clients"} onClick={() => setActiveTab("clients")} icon={<Users size={15} />}>Order Clients</AdminTab>
              <AdminTab active={activeTab === "leads"} onClick={() => setActiveTab("leads")} icon={<UserPlus size={15} />}>Customer Leads CRM</AdminTab>
              <AdminTab active={activeTab === "vouchers"} onClick={() => setActiveTab("vouchers")} icon={<TicketPercent size={15} />}>Discount vouchers</AdminTab>
              <AdminTab active={activeTab === "flyers"} onClick={() => setActiveTab("flyers")} icon={<Sparkles size={15} />}>Social proof flyers</AdminTab>
              <AdminTab active={activeTab === "december"} onClick={() => setActiveTab("december")} icon={<Gift size={15} />}>December Pre-Orders</AdminTab>
            </div>
          </div>
        )}
        {!passcode ? (
          <form onSubmit={submitPasscode} className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5">
            <ShieldCheck className="mx-auto text-[#3F8F3F]" size={40} />
            <h2 className="mt-3 text-center text-xl font-semibold">Admin sign in</h2>
            <p className="mt-1 text-center text-sm text-[#0F3D24]/70">Sign in with your administrator, manager, or staff account credentials.</p>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="mt-6 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
            />
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Passcode"
              autoComplete="current-password"
              className="mt-3 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
            />
            {authError && <p className="mt-2 text-sm text-red-600">{authError}</p>}
            <button type="submit" disabled={isLoggingIn} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#134a2c] disabled:opacity-75">
              {isLoggingIn && <Loader2 size={16} className="animate-spin" />}
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(true)}
                className="text-xs font-semibold text-[#0F3D24]/70 hover:text-[#3F8F3F] transition underline"
              >
                Forgot Passcode / Password?
              </button>
            </div>
          </form>
        ) : query.isLoading ? (
          <p className="text-center text-[#0F3D24]/60">Loading orders…</p>
        ) : query.data ? (
          (() => {
            const allOrders = query.data.orders;
            const role = query.data.role;
            const reasonOptions = Array.from(
              new Set(allOrders.map((o) => (o.cancelReason ?? "").trim()).filter(Boolean)),
            ).sort();
            const scoped = reasonFilter
              ? allOrders.filter((o) => (o.cancelReason ?? "").trim() === reasonFilter)
              : allOrders;
            return (
              <>
                {activeTab === "orders" ? (
                  <>
                    <ReportsPanel
                      orders={scoped}
                      from={from} setFrom={setFrom}
                      to={to} setTo={setTo}
                      statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                      payFilter={payFilter} setPayFilter={setPayFilter}
                      zoneFilter={zoneFilter} setZoneFilter={setZoneFilter}
                      search={search} setSearch={setSearch}
                      reasonFilter={reasonFilter} setReasonFilter={setReasonFilter} reasonOptions={reasonOptions}
                      onApply={applyFilters} onReset={resetFilters} onQuickRange={setRange}
                    />
                    <div className="mb-4 flex flex-wrap gap-2">
                      <FilterBtn
                        active={filter === "awaiting"}
                        onClick={() => setFilter("awaiting")}
                        count={scoped.filter((o) => o.paymentStatus === "submitted" || (Boolean(o.paymentSubmittedAt) && o.paymentStatus !== "approved")).length}
                      >
                        Awaiting payment approval
                      </FilterBtn>
                      <FilterBtn active={filter === "cancelled_customer"} onClick={() => setFilter("cancelled_customer")} count={scoped.filter(o => o.status === "cancelled" && o.cancelledBy === "customer").length}>
                        Cancelled by customer
                      </FilterBtn>
                      <FilterBtn active={filter === "cancelled_admin"} onClick={() => setFilter("cancelled_admin")} count={scoped.filter(o => o.status === "cancelled" && o.cancelledBy !== "customer").length}>
                        Cancelled by farm
                      </FilterBtn>
                      <FilterBtn active={filter === "not_completed"} onClick={() => setFilter("not_completed")} count={scoped.filter(isNotCompleted).length}>
                        Not completed
                      </FilterBtn>
                      <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} count={scoped.length}>
                        All orders
                      </FilterBtn>
                    </div>
                    <div className="mt-4">
                      {(() => {
                        const all = scoped;
                        const filtered =
                          filter === "awaiting" ? all.filter((o) => o.paymentStatus === "submitted" || (Boolean(o.paymentSubmittedAt) && o.paymentStatus !== "approved"))
                            : filter === "cancelled_customer" ? all.filter((o) => o.status === "cancelled" && o.cancelledBy === "customer")
                              : filter === "cancelled_admin" ? all.filter((o) => o.status === "cancelled" && o.cancelledBy !== "customer")
                                : filter === "not_completed" ? all.filter(isNotCompleted)
                                  : all;
                        return (
                          <OrganizedOrdersList
                            orders={filtered}
                            passcode={passcode}
                            role={role}
                            batches={batchesQuery.data || []}
                            onSaved={() => query.refetch()}
                          />
                        );
                      })()}
                    </div>
                  </>
                ) : activeTab === "financials" ? (
                  <BatchFinancialsPanel passcode={passcode} />
                ) : activeTab === "activities" ? (
                  <DailyActivitiesPanel passcode={passcode} />
                ) : activeTab === "clients" ? (
                  <ClientCrmPanel passcode={passcode} />
                ) : activeTab === "leads" ? (
                  <LeadCrmPanel passcode={passcode} />
                ) : activeTab === "vouchers" ? (
                  <VoucherPanel passcode={passcode} />
                ) : activeTab === "december" ? (
                  <DecemberPreorderPanel passcode={passcode} />
                ) : activeTab === "flyers" ? (
                  <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
                    <Sparkles size={40} className="mx-auto text-[#3F8F3F]" />
                    <h3 className="text-xl font-extrabold text-[#0F3D24]">Digital Promotion & Order Flyers</h3>
                    <p className="text-xs text-[#0F3D24]/70 max-w-md mx-auto">
                      Generate branded promotional posters for Christmas specials or single order verification graphics to post on WhatsApp and social media.
                    </p>
                    <button
                      onClick={() => { setSelectedFlyerOrder(null); setShowFlyerModal(true); }}
                      className="rounded-full bg-[#0F3D24] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#134a2c] transition"
                    >
                      Open Digital Flyer Generator
                    </button>
                  </div>
                ) : (
                  <SocialProofPanel orders={allOrders} />
                )}
              </>
            );
          })()
        ) : null}
      </section>

      {showFlyerModal && (
        <FlyerGeneratorModal
          isOpen={showFlyerModal}
          onClose={() => { setShowFlyerModal(false); setSelectedFlyerOrder(null); }}
          initialOrderData={selectedFlyerOrder}
        />
      )}

      {showRecoveryModal && (
        <PasswordRecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          onSuccess={(newPasscode) => {
            const credential = JSON.stringify({ username: "owner", passcode: newPasscode, loginAt: Date.now(), lastActive: Date.now() });
            localStorage.setItem(STORAGE_KEY, credential);
            setPasscode(credential);
          }}
        />
      )}
    </SiteLayout>
  );
}

function AdminTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 text-center text-xs font-semibold transition ${active
        ? "bg-[#0F3D24] text-white shadow-sm ring-1 ring-[#0F3D24]"
        : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-[#F7F5F0]"
        }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

function ClientCrmPanel({ passcode }: { passcode: string }) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const listFn = useServerFn(adminListClients);
  const query = useQuery({
    queryKey: ["admin-clients", passcode, appliedSearch],
    queryFn: () => listFn({ data: { passcode, search: appliedSearch || null } }),
    retry: 1,
    placeholderData: (previousData) => previousData,
  });
  const clients = query.data?.clients ?? [];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#3F8F3F]"><Users size={18} /><span className="text-xs font-semibold uppercase tracking-widest">Client CRM</span></div>
          <h2 className="mt-2 text-2xl font-semibold text-[#0F3D24]">Clients and order history</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#0F3D24]/65">Review repeat customers, approved payments, order value, and the latest delivery status in one place.</p>
        </div>
        <div className="rounded-2xl bg-[#F7F5F0] px-4 py-3 text-right ring-1 ring-[#0F3D24]/5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/55">Clients found</div>
          <div className="mt-1 text-xl font-semibold text-[#0F3D24]">{clients.length}</div>
        </div>
      </div>

      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(search.trim());
          setSelectedKey(null);
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search client name, phone or address"
          className="min-w-0 flex-1 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
        />
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-5 py-3 text-sm font-semibold text-white hover:bg-[#134a2c]"><Search size={15} /> Search clients</button>
      </form>

      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-[#0F3D24]/60">Loading client records...</p>
      ) : query.error ? (
        <p className="py-10 text-center text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Could not load client records."}</p>
      ) : clients.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#0F3D24]/60">No client records match this search.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-[#0F3D24]/10">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="bg-[#F7F5F0] text-[10px] uppercase tracking-widest text-[#0F3D24]/60">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Amount paid</th>
                <th className="px-4 py-3 font-semibold">Total ordered</th>
                <th className="px-4 py-3 font-semibold">Latest order</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F3D24]/10">
              {clients.map((client) => {
                const expanded = selectedKey === client.key;
                return (
                  <tr key={client.key} className="align-top">
                    <td colSpan={6} className="p-0">
                      <button
                        type="button"
                        onClick={() => setSelectedKey(expanded ? null : client.key)}
                        className="grid w-full grid-cols-[minmax(220px,1.6fr)_0.7fr_1fr_1fr_1fr_1fr] gap-0 text-left hover:bg-[#F7F5F0]/70"
                        aria-expanded={expanded}
                      >
                        <span className="px-4 py-4">
                          <span className="block font-semibold text-[#0F3D24]">{client.customerName}</span>
                          <span className="mt-1 block text-xs text-[#0F3D24]/60">{client.phone}</span>
                        </span>
                        <span className="px-4 py-4 text-[#0F3D24]">{client.totalOrders}<span className="block text-[10px] text-[#0F3D24]/55">{client.approvedOrders} paid</span></span>
                        <span className="px-4 py-4 font-semibold text-[#0F3D24]">{naira(client.amountPaid)}</span>
                        <span className="px-4 py-4 text-[#0F3D24]">{naira(client.amountOrdered)}</span>
                        <span className="px-4 py-4 text-xs text-[#0F3D24]/70"><span className="font-mono font-semibold text-[#3F8F3F]">{client.lastOrderCode}</span><span className="mt-1 block">{new Date(client.lastOrderAt).toLocaleDateString()}</span></span>
                        <span className="px-4 py-4 text-xs font-semibold text-[#0F3D24]">{STATUS_LABEL[client.lastStatus]}</span>
                      </button>
                      {expanded && <ClientDetails client={client} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClientDetails({ client }: { client: ClientRecord }) {
  return (
    <div className="border-t border-[#0F3D24]/10 bg-[#F7F5F0]/65 px-4 py-5">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div><div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/55">Phone</div><a href={`tel:${client.phone}`} className="mt-1 block font-semibold text-[#3F8F3F]">{client.phone}</a></div>
        <div className="sm:col-span-2"><div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/55">Latest address</div><div className="mt-1 font-semibold text-[#0F3D24]">{client.address}</div></div>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl bg-white ring-1 ring-[#0F3D24]/10">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-[#0F3D24]/10 text-[10px] uppercase tracking-widest text-[#0F3D24]/55"><tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Discount</th><th className="px-3 py-2">Payment</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-[#0F3D24]/10">
            {client.orders.map((order) => (
              <tr key={order.orderCode}>
                <td className="px-3 py-3 font-mono font-semibold text-[#3F8F3F]">{order.orderCode}</td>
                <td className="px-3 py-3 text-[#0F3D24]/70">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-3 font-semibold text-[#0F3D24]">{naira(order.total)}</td>
                <td className="px-3 py-3 text-[#0F3D24]/70">{order.discountAmount ? `${naira(order.discountAmount)}${order.voucherCode ? ` · ${order.voucherCode}` : ""}` : "None"}</td>
                <td className="px-3 py-3 capitalize text-[#0F3D24]/70">{order.paymentStatus}</td>
                <td className="px-3 py-3 font-semibold text-[#0F3D24]">{STATUS_LABEL[order.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VoucherPanel({ passcode }: { passcode: string }) {
  const [form, setForm] = useState({ code: "", displayName: "", discountType: "percent" as AdminVoucher["discountType"], discountValue: "", recipientName: "", recipientPhone: "", note: "", expiresAt: "", maxUses: "" });
  const [editingVoucher, setEditingVoucher] = useState<AdminVoucher | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listFn = useServerFn(adminListVouchers);
  const createFn = useServerFn(adminCreateVoucher);
  const toggleFn = useServerFn(adminToggleVoucher);
  const updateFn = useServerFn(adminUpdateVoucher);
  const deleteFn = useServerFn(adminDeleteVoucher);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-vouchers", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  const createMutation = useMutation({
    mutationFn: () => createFn({
      data: {
        passcode,
        code: form.code.trim() || null,
        displayName: form.displayName.trim() || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        recipientName: form.recipientName.trim() || null,
        recipientPhone: form.recipientPhone.trim() || null,
        note: form.note.trim() || null,
        expiresAt: form.expiresAt || null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
      },
    }),
    onSuccess: (result) => {
      setMessage(`Voucher ${result.voucher.code} created.`);
      setForm({ code: "", displayName: "", discountType: "percent", discountValue: "", recipientName: "", recipientPhone: "", note: "", expiresAt: "", maxUses: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin-vouchers", passcode] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (v: AdminVoucher) => updateFn({
      data: {
        passcode,
        id: v.id,
        displayName: v.displayName || null,
        discountType: v.discountType,
        discountValue: v.discountValue,
        recipientName: v.recipientName || null,
        recipientPhone: v.recipientPhone || null,
        note: v.note || null,
        expiresAt: v.expiresAt || null,
        maxUses: v.maxUses || null,
        active: v.active,
      },
    }),
    onSuccess: (result) => {
      setMessage(`Voucher ${result.voucher.code} updated.`);
      setEditingVoucher(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-vouchers", passcode] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { passcode, id } }),
    onSuccess: () => {
      setMessage("Voucher deleted.");
      void queryClient.invalidateQueries({ queryKey: ["admin-vouchers", passcode] });
    },
    onError: (error: Error) => setMessage(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (voucher: AdminVoucher) => toggleFn({ data: { passcode, id: voucher.id, active: !voucher.active } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-vouchers", passcode] }),
    onError: (error: Error) => setMessage(error.message),
  });

  const vouchers = query.data?.vouchers ?? [];
  const inputClass = "mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3F8F3F]";
  const canCreate = Number(form.discountValue) > 0 && (form.discountType !== "percent" || Number(form.discountValue) <= 100) && !createMutation.isPending;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#3F8F3F]/10 text-[#3F8F3F]">
          <TicketPercent size={20} />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Discount vouchers</div>
          <h2 className="mt-1 text-2xl font-semibold text-[#0F3D24]">Create and manage offers</h2>
          <p className="mt-1 text-sm text-[#0F3D24]/65">Generate a code for a customer, set its limits, edit existing ones, or delete outdated vouchers.</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-5 ring-1 ring-[#0F3D24]/10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Voucher name (optional)<input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} placeholder="e.g. New customer offer" className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Code (optional)<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="Auto generate if blank" className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Discount type<select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value as AdminVoucher["discountType"] })} className={inputClass}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Value<input required type="number" min={1} max={form.discountType === "percent" ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} placeholder={form.discountType === "percent" ? "e.g. 10" : "e.g. 1000"} className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Expires on<input type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Recipient name<input value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} placeholder="Optional" className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Recipient phone<input type="tel" value={form.recipientPhone} onChange={(event) => setForm({ ...form, recipientPhone: event.target.value })} placeholder="Optional" className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Maximum uses<input type="number" min={1} value={form.maxUses} onChange={(event) => setForm({ ...form, maxUses: event.target.value })} placeholder="Unlimited" className={inputClass} /></label>
          <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Internal note<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Optional" className={inputClass} /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!canCreate} onClick={() => createMutation.mutate()} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50">
            <TicketPercent size={15} /> {createMutation.isPending ? "Creating..." : "Create voucher"}
          </button>
          {message && <span className="text-sm font-semibold text-[#0F3D24]/75">{message}</span>}
        </div>
      </div>

      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-[#0F3D24]/60">Loading vouchers...</p>
      ) : query.error ? (
        <p className="py-10 text-center text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Could not load vouchers."}</p>
      ) : vouchers.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#0F3D24]/60">No vouchers created yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-[#0F3D24]/10">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-[#F7F5F0] text-[10px] uppercase tracking-widest text-[#0F3D24]/60">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0F3D24]/10">
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 font-mono font-semibold text-[#3F8F3F]">
                      {voucher.code}
                      <button type="button" title="Copy voucher code" aria-label={`Copy ${voucher.code}`} onClick={() => void navigator.clipboard.writeText(voucher.code)} className="text-[#0F3D24]/50 hover:text-[#3F8F3F]">
                        <Copy size={14} />
                      </button>
                    </div>
                    {voucher.displayName && <div className="text-xs font-semibold text-[#0F3D24]">{voucher.displayName}</div>}
                    {voucher.note && <div className="mt-1 text-xs text-[#0F3D24]/55">{voucher.note}</div>}
                  </td>
                  <td className="px-4 py-4 font-semibold text-[#0F3D24]">
                    {voucher.discountType === "percent" ? `${voucher.discountValue}% off` : `${naira(voucher.discountValue)} off`}
                  </td>
                  <td className="px-4 py-4 text-[#0F3D24]/70">
                    {voucher.recipientName || "Any customer"}
                    {voucher.recipientPhone && <span className="block text-xs">{voucher.recipientPhone}</span>}
                  </td>
                  <td className="px-4 py-4 text-[#0F3D24]/70">
                    {voucher.usesCount}{voucher.maxUses ? ` / ${voucher.maxUses}` : " / unlimited"}
                  </td>
                  <td className="px-4 py-4 text-[#0F3D24]/70">
                    {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : "No expiry"}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voucher.active ? "bg-[#3F8F3F]/10 text-[#0F3D24]" : "bg-[#F7F5F0] text-[#0F3D24]/55"}`}>
                      {voucher.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(voucher)}
                        className="rounded-full bg-[#F7F5F0] px-3 py-1 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white transition"
                      >
                        {voucher.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingVoucher(voucher)}
                        className="p-1.5 rounded-full text-[#3F8F3F] hover:bg-[#3F8F3F]/10 transition"
                        title="Edit voucher"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete voucher ${voucher.code}?`)) deleteMutation.mutate(voucher.id);
                        }}
                        className="p-1.5 rounded-full text-rose-600 hover:bg-rose-50 transition"
                        title="Delete voucher"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Voucher Modal */}
      {editingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0F3D24]">Edit Voucher: {editingVoucher.code}</h3>
              <button onClick={() => setEditingVoucher(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Voucher Name
                <input
                  value={editingVoucher.displayName || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, displayName: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Discount Type
                <select
                  value={editingVoucher.discountType}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, discountType: e.target.value as any })}
                  className={inputClass}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Discount Value
                <input
                  type="number"
                  value={editingVoucher.discountValue}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, discountValue: Number(e.target.value) })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Expires On
                <input
                  type="date"
                  value={editingVoucher.expiresAt || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, expiresAt: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Recipient Name
                <input
                  value={editingVoucher.recipientName || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, recipientName: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Recipient Phone
                <input
                  value={editingVoucher.recipientPhone || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, recipientPhone: e.target.value })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Max Uses
                <input
                  type="number"
                  value={editingVoucher.maxUses || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, maxUses: e.target.value ? Number(e.target.value) : null })}
                  className={inputClass}
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Status
                <select
                  value={editingVoucher.active ? "true" : "false"}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, active: e.target.value === "true" })}
                  className={inputClass}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                Internal Note
                <input
                  value={editingVoucher.note || ""}
                  onChange={(e) => setEditingVoucher({ ...editingVoucher, note: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditingVoucher(null)}
                className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(editingVoucher)}
                className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#134a2c]"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type FlyerStage = "received" | "delivered";

function maskedCustomerName(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();
  return first ? `${first}. valued customer` : "Valued customer";
}

function maskedPhone(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  if (digits.length < 5) return "Private customer";
  return `${digits.slice(0, 2)}••••••${digits.slice(-2)}`;
}

function flyerCaption(order: AdminOrder, stage: FlyerStage): string {
  return stage === "delivered"
    ? `Thank you for choosing Dignity Agro Farms. Order ${order.orderCode} has been delivered. Farm fresh chicken, straight to your door.`
    : `Thank you for choosing Dignity Agro Farms. Order ${order.orderCode} has been received and is being prepared.`;
}

function SocialProofPanel({ orders }: { orders: AdminOrder[] }) {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const filteredOrders = orders.filter((order) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [order.orderCode, order.customerName, order.phone, order.status].some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#3F8F3F]"><Sparkles size={18} /><span className="text-xs font-semibold uppercase tracking-widest">Social proof flyers</span></div>
          <h2 className="mt-2 text-2xl font-semibold text-[#0F3D24]">Thank you flyers</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#0F3D24]/65">Turn an order into a shareable thank you graphic. Customer names and phone numbers are automatically kept private.</p>
        </div>
        <div className="rounded-2xl bg-[#F7F5F0] px-4 py-3 text-right ring-1 ring-[#0F3D24]/5">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/55">Orders available</div>
          <div className="mt-1 text-xl font-semibold text-[#0F3D24]">{orders.length}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find an order by code or customer"
          className="min-w-0 flex-1 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
        />
        <span className="inline-flex items-center justify-center rounded-xl bg-[#F7F5F0] px-4 py-3 text-xs font-semibold text-[#0F3D24]/65 ring-1 ring-[#0F3D24]/10">Select an order below</span>
      </div>

      {filteredOrders.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#0F3D24]/60">No orders match this search.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-[#0F3D24]/10">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[#F7F5F0] text-[10px] uppercase tracking-widest text-[#0F3D24]/60"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-[#0F3D24]/10">
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-4 font-mono font-semibold text-[#3F8F3F]">{order.orderCode}</td>
                  <td className="px-4 py-4"><div className="font-semibold text-[#0F3D24]">{order.customerName}</div><div className="text-xs text-[#0F3D24]/55">{order.phone}</div></td>
                  <td className="px-4 py-4 text-xs font-semibold text-[#0F3D24]">{STATUS_LABEL[order.status]}</td>
                  <td className="px-4 py-4 text-xs text-[#0F3D24]/65">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4"><button type="button" onClick={() => setSelectedOrder(order)} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134a2c]"><Sparkles size={14} /> Create flyer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && <ThankYouFlyerModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}

function ThankYouFlyerModal({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const [stage, setStage] = useState<FlyerStage>(order.status === "delivered" ? "delivered" : "received");
  const canvasRef = useState<HTMLCanvasElement | null>(null)[0];
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#F7F5F0";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#0F3D24";
    context.fillRect(0, 0, width, 340);
    context.fillStyle = "#3F8F3F";
    context.fillRect(0, 340, width, 18);
    context.fillStyle = "#FFFFFF";
    context.font = "700 34px Arial, sans-serif";
    context.fillText("DIGNITY AGRO FARMS LIMITED", 76, 90);
    context.font = "400 22px Arial, sans-serif";
    context.fillStyle = "#A8E6A8";
    context.fillText("Farm fresh chicken. Straight to your door.", 78, 137);
    context.fillStyle = "#FFFFFF";
    context.font = "700 66px Arial, sans-serif";
    context.fillText("THANK YOU", 76, 245);
    context.font = "700 30px Arial, sans-serif";
    context.fillText(stage === "delivered" ? "ORDER DELIVERED" : "ORDER RECEIVED", 80, 295);
    context.fillStyle = "#0F3D24";
    context.font = "700 34px Arial, sans-serif";
    context.fillText(stage === "delivered" ? "Another farm fresh order delivered." : "Your order is safely with our team.", 78, 475);
    context.fillStyle = "#3F8F3F";
    context.font = "700 26px Arial, sans-serif";
    context.fillText("A THANK YOU FROM OUR FARM TO YOUR HOME", 80, 535);
    context.fillStyle = "#0F3D24";
    context.font = "400 30px Arial, sans-serif";
    context.fillText(`Order ${order.orderCode}`, 80, 625);
    context.font = "400 27px Arial, sans-serif";
    context.fillText(`${maskedCustomerName(order.customerName)}  •  ${maskedPhone(order.phone)}`, 80, 680);
    context.fillStyle = "#FFFFFF";
    context.fillRect(78, 765, 924, 150);
    context.strokeStyle = "#D5E3D4";
    context.lineWidth = 3;
    context.strokeRect(78, 765, 924, 150);
    context.fillStyle = "#0F3D24";
    context.font = "700 28px Arial, sans-serif";
    context.fillText("Healthy birds. Fair farm prices. Honest service.", 112, 830);
    context.font = "400 24px Arial, sans-serif";
    context.fillText("Live birds  •  Dressed chicken  •  Fresh eggs", 112, 875);
    context.fillStyle = "#3F8F3F";
    context.font = "700 27px Arial, sans-serif";
    context.fillText("Affordable meat for every home, at farm price.", 80, 985);
  }, [canvas, order, stage]);

  const download = () => {
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `dignity-thank-you-${order.orderCode}-${stage}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const share = async () => {
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = blob ? new File([blob], `dignity-thank-you-${order.orderCode}.png`, { type: "image/png" }) : null;
    if (file && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ title: "Dignity Agro Farms", text: flyerCaption(order, stage), files: [file] });
      return;
    }
    await navigator.clipboard?.writeText(flyerCaption(order, stage));
    window.open(`https://wa.me/?text=${encodeURIComponent(flyerCaption(order, stage))}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F3D24]/70 p-4" role="dialog" aria-modal="true" aria-label="Thank you flyer">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Flyer preview</div><h3 className="mt-1 text-2xl font-semibold text-[#0F3D24]">Share this order story</h3><p className="mt-1 text-sm text-[#0F3D24]/60">Personal details are masked on the graphic.</p></div>
          <button type="button" onClick={onClose} aria-label="Close flyer preview" title="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F7F5F0] text-[#0F3D24] hover:bg-[#e9e6de]"><X size={17} /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setStage("received")} className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${stage === "received" ? "bg-[#0F3D24] text-white ring-[#0F3D24]" : "bg-white text-[#0F3D24] ring-[#0F3D24]/15"}`}>Order received</button>
          <button type="button" onClick={() => setStage("delivered")} className={`rounded-xl px-4 py-3 text-sm font-semibold ring-1 ${stage === "delivered" ? "bg-[#3F8F3F] text-white ring-[#3F8F3F]" : "bg-white text-[#0F3D24] ring-[#0F3D24]/15"}`}>Order delivered</button>
        </div>
        <canvas ref={setCanvas} className="mt-5 aspect-square w-full rounded-2xl bg-[#F7F5F0] shadow-sm ring-1 ring-[#0F3D24]/10" />
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-3 text-sm font-semibold text-white hover:bg-[#134a2c]"><ImageDown size={16} /> Download flyer</button>
          <button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1eb856]"><Share2 size={16} /> Share to WhatsApp</button>
        </div>
        <p className="mt-3 text-xs text-[#0F3D24]/55">On a phone, WhatsApp opens its share sheet so you can choose your group. On a computer, download the image and attach it in WhatsApp Web.</p>
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${active ? "bg-[#0F3D24] text-white" : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-[#F7F5F0]"}`}
    >
      {children} <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-[#0F3D24]/10"}`}>{count}</span>
    </button>
  );
}

function ReportsPanel({
  orders, from, setFrom, to, setTo, statusFilter, setStatusFilter, payFilter, setPayFilter,
  zoneFilter, setZoneFilter, search, setSearch, reasonFilter, setReasonFilter, reasonOptions,
  onApply, onReset, onQuickRange,
}: {
  orders: AdminOrder[];
  from: string; setFrom: (v: string) => void;
  to: string; setTo: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  payFilter: string; setPayFilter: (v: string) => void;
  zoneFilter: string; setZoneFilter: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  reasonFilter: string; setReasonFilter: (v: string) => void; reasonOptions: string[];
  onApply: () => void; onReset: () => void; onQuickRange: (d: number | "month") => void;
}) {
  const [zipping, setZipping] = useState(false);
  const paidOrders = orders.filter((o) => o.paymentStatus === "approved");
  const revenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const fees = paidOrders.reduce((s, o) => s + o.deliveryFee, 0);
  const avg = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;

  const exportCsv = () => {
    const head = ["Order code", "Date", "Customer", "Phone", "Zone", "Items", "Subtotal", "Delivery fee", "Total", "Order status", "Payment status", "Paid at", "Cancelled by", "Cancel reason", "Cancelled at", "Not completed"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = orders.map((o) => [
      o.orderCode,
      new Date(o.createdAt).toLocaleString(),
      o.customerName,
      o.phone,
      o.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri",
      o.items.map((i) => `${i.product} - ${i.option} x${i.qty}`).join("; "),
      o.subtotal,
      o.deliveryFee,
      o.total,
      STATUS_LABEL[o.status],
      o.paymentStatus,
      o.paymentApprovedAt ? new Date(o.paymentApprovedAt).toLocaleString() : "",
      o.status === "cancelled" ? (o.cancelledBy === "customer" ? "Customer" : "Farm") : "",
      o.cancelReason ?? "",
      o.cancelledAt ? new Date(o.cancelledAt).toLocaleString() : "",
      isNotCompleted(o) ? "Yes" : "",
    ].map(esc).join(","));
    const blob = new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dignity-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const byStatus = STATUS_OPTIONS.map((s) => ({ label: s.label, count: orders.filter((o) => o.status === s.value).length }));

  // Bundle a printable receipt/invoice for every order in the current range into one ZIP.
  const downloadZip = async () => {
    if (orders.length === 0) return;
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder("receipts")!;
      for (const o of orders) {
        const kind = o.paymentStatus === "approved" ? "receipt" : "invoice";
        const day = new Date(o.createdAt).toISOString().slice(0, 10);
        folder.file(`${day}_${o.orderCode}_${kind}.html`, receiptHtml(o));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const range = from || to ? `${from || "start"}_to_${to || "today"}` : new Date().toISOString().slice(0, 10);
      a.download = `dignity-receipts-${range}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  const inputCls = "mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#0F3D24] outline-none focus:border-[#3F8F3F]";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]";

  return (
    <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#0F3D24]">Reports</h2>
        <div className="flex flex-wrap gap-2">
          <QuickBtn onClick={() => onQuickRange(1)}>Today</QuickBtn>
          <QuickBtn onClick={() => onQuickRange(7)}>Last 7 days</QuickBtn>
          <QuickBtn onClick={() => onQuickRange("month")}>This month</QuickBtn>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full bg-[#3F8F3F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4ea94e]">
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={downloadZip}
            disabled={zipping || orders.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50"
          >
            <FileArchive size={14} /> {zipping ? "Zipping…" : `Download all receipts (${orders.length}) ZIP`}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelCls}>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></label>
        <label className={labelCls}>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></label>
        <label className={labelCls}>
          Order status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className={labelCls}>
          Payment status
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={inputCls}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label className={labelCls}>
          Delivery zone
          <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className={inputCls}>
            <option value="">All</option>
            <option value="owerri">Owerri town</option>
            <option value="outside">Outside Owerri</option>
          </select>
        </label>
        <label className={labelCls}>
          Cancellation reason
          <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className={inputCls}>
            <option value="">All</option>
            {reasonOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className={labelCls}>
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onApply()} placeholder="Order code, name or phone" className={inputCls} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onApply} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2 text-sm font-semibold text-white hover:bg-[#134a2c]">
          <Search size={14} /> Apply filters
        </button>
        <button onClick={onReset} className="rounded-full bg-[#F7F5F0] px-5 py-2 text-sm font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white">
          Reset
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Revenue (approved)" value={naira(revenue)} />
        <Stat label="Delivery fees" value={naira(fees)} />
        <Stat label="Avg order value" value={naira(avg)} />
        <Stat label="Cancelled" value={String(orders.filter((o) => o.status === "cancelled").length)} />
        <Stat label="Not completed" value={String(orders.filter(isNotCompleted).length)} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#0F3D24]/70">
        {byStatus.map((s) => (
          <span key={s.label} className="rounded-full bg-[#F7F5F0] px-3 py-1 ring-1 ring-[#0F3D24]/10">{s.label}: <strong>{s.count}</strong></span>
        ))}
      </div>
    </div>
  );
}

function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white">
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/60">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[#0F3D24]">{value}</div>
    </div>
  );
}

export function OrderRow({ order, passcode, role, batches, onSaved }: { order: AdminOrder; passcode: string; role: AdminRole; batches?: FarmBatch[]; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState(order.statusNote ?? "");
  const [eta, setEta] = useState(order.eta ?? "");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(order.customerName);
  const [phone, setPhone] = useState(order.phone);
  const [address, setAddress] = useState(order.address);
  const [notes, setNotes] = useState(order.notes ?? "");
  const updateFn = useServerFn(adminUpdateOrder);
  const decideFn = useServerFn(adminDecidePayment);
  const correctFn = useServerFn(adminCorrectOrder);
  const deleteFn = useServerFn(adminDeleteOrder);
  const assignOrderBatchFn = useServerFn(adminAssignOrderBatch);

  const assignBatchMut = useMutation({
    mutationFn: (batchId: string | null) => assignOrderBatchFn({ data: { passcode, id: order.id, batchId } }),
    onSuccess: () => onSaved(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: { passcode, id: order.id, status, statusNote: note || null, eta: eta || null },
      }),
    onSuccess: () => onSaved(),
  });
  const paymentMutation = useMutation({
    mutationFn: (vars: { decision: "approved" | "rejected"; reason?: string }) =>
      decideFn({ data: { passcode, id: order.id, decision: vars.decision, reason: vars.reason ?? null } }),
    onSuccess: () => { setShowReject(false); setRejectReason(""); onSaved(); },
  });
  const correctionMutation = useMutation({
    mutationFn: () => correctFn({ data: { passcode, id: order.id, customerName, phone, address, notes: notes || null } }),
    onSuccess: () => { setEditing(false); onSaved(); },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { passcode, id: order.id } }),
    onSuccess: onSaved,
  });

  // Open WhatsApp synchronously on click (avoids popup blocking), then record the decision.
  const decideAndNotify = (decision: "approved" | "rejected", reason?: string) => {
    window.open(paymentWaLink(order, decision, reason), "_blank", "noopener,noreferrer");
    paymentMutation.mutate({ decision, reason });
  };

  const dirty = status !== order.status || (note ?? "") !== (order.statusNote ?? "") || (eta ?? "") !== (order.eta ?? "");

  // Save the pending edits and immediately open WhatsApp with the NEW status message.
  const saveAndNotify = () => {
    window.open(
      waLink(order, { status, statusNote: note || null, eta: eta || null }),
      "_blank",
      "noopener,noreferrer",
    );
    if (status === "delivered") {
      window.location.href = thankYouSms({ ...order, status });
    }
    mutation.mutate();
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/10 transition-all overflow-hidden">
      {/* Clickable Card Summary Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full text-left p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 transition-colors ${expanded ? "bg-[#F7F5F0]/60 border-b border-[#0F3D24]/10" : "hover:bg-[#F7F5F0]/30"
          }`}
      >
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base sm:text-lg font-extrabold text-[#0F3D24]">{order.orderCode}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F3D24]/10 px-2.5 py-0.5 text-xs font-bold text-[#0F3D24]">
              🛒 Store Order
            </span>
            {order.batchName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <Layers size={12} /> {order.batchName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                Unassigned Batch
              </span>
            )}
            {/* Status Pill Badge */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${order.status === "delivered" ? "bg-emerald-100 text-emerald-800" :
              order.status === "cancelled" ? "bg-red-100 text-red-800" :
                order.status === "preparing" ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
              }`}>
              {order.status.replace("_", " ")}
            </span>
          </div>

          <div className="text-sm">
            <span className="font-semibold text-[#0F3D24]">{order.customerName}</span> ·{" "}
            <a
              className="text-[#3F8F3F] font-semibold hover:underline"
              href={`tel:${order.phone}`}
              onClick={(e) => e.stopPropagation()}
            >
              {order.phone}
            </a>
          </div>
          <div className="text-xs text-[#0F3D24]/70 truncate max-w-md">
            {order.address} · {order.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[#0F3D24]/60">Total</div>
            <div className="text-base sm:text-lg font-bold text-[#0F3D24]">{naira(order.total)}</div>
            <div className="text-[11px] text-[#0F3D24]/60">{new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F3D24]/70 ring-1 ring-[#0F3D24]/10">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Expanded Operational Content Body */}
      {expanded && (
        <div className="p-5 sm:p-6 space-y-4">
          {/* Move to Batch Dropdown Control */}
          {batches && batches.length > 0 && role !== "staff" && (
            <div className="flex items-center gap-2 text-xs bg-[#F7F5F0] p-3 rounded-2xl ring-1 ring-[#0F3D24]/10">
              <span className="font-bold text-[#0F3D24]">Move to Batch:</span>
              <select
                value={order.batchId || ""}
                onChange={(e) => assignBatchMut.mutate(e.target.value || null)}
                disabled={assignBatchMut.isPending}
                className="rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="">Unassigned</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
              {assignBatchMut.isPending && <Loader2 size={12} className="animate-spin text-[#3F8F3F]" />}
            </div>
          )}

          {order.status === "cancelled" && (
            <div className="inline-flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700 ring-1 ring-red-200 w-full">
              <Ban size={14} />
              {order.cancelledBy === "customer" ? "Cancelled by customer" : "Cancelled by farm"}
              {order.cancelReason ? `: ${order.cancelReason}` : ""}
              {order.cancelledAt ? ` · ${new Date(order.cancelledAt).toLocaleString()}` : ""}
            </div>
          )}

          {isNotCompleted(order) && (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 p-3 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 w-full">
              <AlertTriangle size={14} /> Not completed: no payment for over 24h
            </div>
          )}

          {order.notes && (
            <div className="text-xs italic text-[#0F3D24]/70 bg-amber-50/50 p-3 rounded-2xl ring-1 ring-amber-200/50">
              Note: "{order.notes}"
            </div>
          )}

          <PaymentSection
            order={order}
            onApprove={() => decideAndNotify("approved")}
            onReject={() => decideAndNotify("rejected", rejectReason)}
            showReject={showReject}
            setShowReject={setShowReject}
            rejectReason={rejectReason}
            setRejectReason={setRejectReason}
            pending={paymentMutation.isPending}
            error={paymentMutation.error instanceof Error ? paymentMutation.error.message : null}
          />

          <div className="rounded-2xl bg-[#F7F5F0] p-4 text-sm space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/60">Items Breakdown</h4>
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between items-center text-xs sm:text-sm">
                <span className="font-semibold text-[#0F3D24]">{it.product} · {it.option} × {it.qty}</span>
                <span className="text-[#0F3D24]/80 font-mono">{naira(it.unitPrice * it.qty)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-[#0F3D24]/10 flex justify-between text-xs text-[#0F3D24]/70">
              <span>Delivery Fee</span>
              <span className="font-semibold">{order.deliveryFee === 0 ? "FREE" : naira(order.deliveryFee)}</span>
            </div>
          </div>

          <OrderTimeline order={order} />

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdminOrder["status"])}
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
              ETA (optional)
              <input
                value={eta}
                onChange={(e) => setEta(e.target.value)}
                placeholder="e.g. Today, before 6PM"
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={() => mutation.mutate()}
                disabled={!dirty || mutation.isPending}
                className="w-full rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50 sm:w-auto"
              >
                {mutation.isPending ? "Saving…" : "Save Status"}
              </button>
            </div>
            <label className="sm:col-span-3 text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
              Note to customer (optional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Rider just left the farm"
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]"
              />
            </label>
          </div>

          {mutation.isError && <p className="mt-2 text-sm text-red-600">{(mutation.error as Error).message}</p>}
          {mutation.isSuccess && !dirty && <p className="mt-2 text-sm text-[#3F8F3F]">Saved.</p>}

          <div className="flex flex-wrap items-center gap-3 border-t border-[#0F3D24]/10 pt-4">
            <button
              onClick={saveAndNotify}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1eb856] disabled:opacity-50"
            >
              <MessageCircle size={15} /> {dirty ? "Save & notify on WhatsApp" : "Notify customer on WhatsApp"}
            </button>
            <button
              type="button"
              onClick={() => {
                const cleanPhone = order.phone.replace(/\D+/g, "");
                const waPhone = cleanPhone.startsWith("0") ? "234" + cleanPhone.slice(1) : cleanPhone;
                const receiptUrl = `${window.location.origin}/receipt/${order.orderCode}?code=${order.trackCode}`;
                const text = `🧾 *Dignity Agro Farms Official Receipt*\n\nCustomer: ${order.customerName}\nOrder Reference: ${order.orderCode}\nTotal Amount: ₦${order.total.toLocaleString()}\nPayment Status: ${(order.paymentStatus || "").toUpperCase()}\n\nView PDF Receipt: ${receiptUrl}\n\nThank you for choosing Dignity Agro Farms!`;
                window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/15 px-4 py-2 text-xs font-bold text-[#0F3D24] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/25 transition"
            >
              <Share2 size={14} className="text-[#25D366]" /> Share Receipt to WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFlyerOrder({
                  orderCode: order.orderCode,
                  customerName: order.customerName,
                  location: order.address,
                  itemsText: order.items.map((i) => `${i.product} × ${i.qty}`).join(", "),
                  totalAmount: order.total,
                  paymentStatus: order.paymentStatus,
                });
                setShowFlyerModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100 transition"
            >
              <Sparkles size={14} className="text-amber-600" /> Generate Order Flyer
            </button>
            <a
              href={waLink(order)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#0F3D24]/60 underline hover:text-[#0F3D24]"
            >
              Resend status
            </a>
            {order.status === "delivered" && (
              <a
                href={thankYouSms(order)}
                className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134a2c]"
              >
                <MessageCircle size={14} /> Send thank you SMS
              </a>
            )}
            <Link
              to="/receipt/$orderCode"
              params={{ orderCode: order.orderCode }}
              search={{ code: order.trackCode }}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white"
            >
              <FileText size={14} /> {order.paymentStatus === "approved" ? "Receipt" : "Invoice"}
            </Link>
            {role === "owner" && (
              <>
                <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white"><Pencil size={14} /> {editing ? "Close correction" : "Correct details"}</button>
                <button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Delete order ${order.orderCode}? This cannot be undone.`)) deleteMutation.mutate(); }} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"><Trash2 size={14} /> Delete order</button>
              </>
            )}
          </div>

          {role === "owner" && editing && (
            <div className="grid gap-3 rounded-2xl bg-[#F7F5F0] p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F] sm:col-span-2">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F] sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 block min-h-20 w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]" /></label>
              <button type="button" disabled={correctionMutation.isPending} onClick={() => correctionMutation.mutate()} className="rounded-full bg-[#3F8F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{correctionMutation.isPending ? "Saving correction…" : "Save correction"}</button>
              {correctionMutation.isError && <p className="text-sm text-red-600 sm:col-span-2">{(correctionMutation.error as Error).message}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentSection({
  order, onApprove, onReject, showReject, setShowReject, rejectReason, setRejectReason, pending, error,
}: {
  order: AdminOrder;
  onApprove: () => void;
  onReject: () => void;
  showReject: boolean;
  setShowReject: (v: boolean) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const badge =
    order.paymentStatus === "approved" ? { bg: "bg-[#3F8F3F]/10", ring: "ring-[#3F8F3F]/30", text: "text-[#0F3D24]", label: "Payment approved", icon: <CheckCircle2 size={14} className="text-[#3F8F3F]" /> }
      : order.paymentStatus === "submitted" ? { bg: "bg-amber-100", ring: "ring-amber-200", text: "text-amber-800", label: "Payment submitted, awaiting approval", icon: <Clock size={14} /> }
        : order.paymentStatus === "rejected" ? { bg: "bg-red-50", ring: "ring-red-200", text: "text-red-700", label: `Rejected${order.paymentRejectionReason ? ": " + order.paymentRejectionReason : ""}`, icon: <XCircle size={14} /> }
          : { bg: "bg-[#F7F5F0]", ring: "ring-[#0F3D24]/10", text: "text-[#0F3D24]/70", label: "Payment pending", icon: <Clock size={14} /> };

  const canDecide = order.paymentStatus === "submitted" || order.paymentStatus === "pending" || order.paymentStatus === "rejected";

  return (
    <div className={`mt-4 rounded-2xl px-4 py-3 ring-1 ${badge.bg} ${badge.ring}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 text-xs font-semibold ${badge.text}`}>
          {badge.icon} {badge.label}
        </div>
        {order.paymentStatus !== "approved" && canDecide && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onApprove}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full bg-[#3F8F3F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4ea94e] disabled:opacity-60"
            >
              <CheckCircle2 size={14} /> Approve payment
            </button>
            <button
              onClick={() => setShowReject(!showReject)}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle size={14} /> Reject
            </button>
          </div>
        )}
      </div>
      {showReject && order.paymentStatus !== "approved" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (e.g. no bank alert received)"
            className="flex-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
          />
          <button
            onClick={onReject}
            disabled={pending}
            className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Confirm reject
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {order.paymentSubmittedAt && (
        <p className="mt-2 text-[10px] uppercase tracking-widest text-[#0F3D24]/50">
          Customer confirmed payment {new Date(order.paymentSubmittedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function DecemberPreorderPanel({ passcode }: { passcode: string }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const listFn = useServerFn(adminListPreorders);
  const listBatchesFn = useServerFn(adminListBatches);
  const qc = useQueryClient();

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    placeholderData: (previousData) => previousData,
  });

  const query = useQuery({
    queryKey: ["admin-preorders", passcode, filter, appliedSearch],
    queryFn: () => {
      const data: any = { passcode, search: appliedSearch || undefined };
      if (filter === "slot_reserved") data.reservationType = "slot_reserved";
      if (filter === "free_reservation") data.reservationType = "free_reservation";
      if (filter === "outright") data.reservationType = "outright";
      if (filter === "pending") data.paymentStatus = "pending";
      if (filter === "partially_paid") data.paymentStatus = "partially_paid";
      if (filter === "fully_paid") data.paymentStatus = "fully_paid";
      if (filter === "delivery_pending") data.deliveryStatus = "pending";
      if (filter === "delivered") data.deliveryStatus = "delivered";
      return listFn({ data });
    },
    refetchInterval: 15000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  const confirmPaymentFn = useServerFn(adminConfirmPreorderPayment);
  const deletePaymentFn = useServerFn(adminDeletePreorderPayment);
  const updateDeliveryFn = useServerFn(adminUpdatePreorderDelivery);
  const addPaymentFn = useServerFn(adminAddPreorderPayment);
  const pendingPaymentsFn = useServerFn(adminListPendingPayments);

  const pendingQuery = useQuery({
    queryKey: ["admin-preorders-pending-payments", passcode],
    queryFn: () => pendingPaymentsFn({ data: { passcode } }),
    refetchInterval: 15000,
    retry: 1,
    placeholderData: (previousData) => previousData,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
        <div className="flex items-center gap-2 text-[#3F8F3F]"><Gift size={18} /><span className="text-xs font-semibold uppercase tracking-widest">December Pre-Orders</span></div>
        <h2 className="mt-2 text-2xl font-semibold text-[#0F3D24]">Holiday Pre-Orders</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#0F3D24]/65">Manage reservations, update delivery status, and coordinate December collections.</p>

        {/* Pending Payments Alert */}
        {pendingQuery.data && pendingQuery.data.length > 0 && (
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">Payment Approvals Needed ({pendingQuery.data.length})</h3>
            <div className="space-y-2">
              {pendingQuery.data.map(({ payment, preorder }) => (
                <div key={payment.id} className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between rounded-xl bg-white p-3 text-sm ring-1 ring-amber-100">
                  <div>
                    <span className="font-bold text-[#0F3D24]">{preorder.preorderCode}</span> · ₦{payment.amount.toLocaleString()}
                    <span className="block text-xs text-slate-500">Ref: {payment.paymentReference} · {preorder.customerName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => { await confirmPaymentFn({ data: { passcode, paymentId: payment.id } }); pendingQuery.refetch(); query.refetch(); }} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">Approve</button>
                    <button onClick={async () => { if (confirm("Reject this payment?")) { await deletePaymentFn({ data: { passcode, paymentId: payment.id } }); pendingQuery.refetch(); query.refetch(); } }} className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <form onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search.trim()); }} className="flex gap-2 w-full sm:max-w-md">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or code" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] shadow-sm" />
          <button type="submit" className="rounded-xl bg-[#0F3D24] px-6 py-3 text-sm font-semibold text-white hover:bg-[#134a2c] transition shadow-sm">Search</button>
        </form>

        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Orders" },
            { id: "awaiting_approval", label: "Awaiting Payment Approval" },
            { id: "slot_reserved", label: "Slot Reserved" },
            { id: "free_reservation", label: "Free" },
            { id: "outright", label: "Paid Outrightly" },
            { id: "partially_paid", label: "Partially Paid" },
            { id: "fully_paid", label: "Fully Paid" },
            { id: "pending", label: "Pay Pending" },
            { id: "delivery_pending", label: "Delivery Pending" },
            { id: "delivered", label: "Delivered" },
          ].map((f) => {
            const count =
              f.id === "all"
                ? query.data?.preorders.length || 0
                : f.id === "awaiting_approval"
                  ? (query.data?.preorders || []).filter(
                    (o: any) => o.payments?.some((p: any) => !p.confirmedByAdmin) || o.paymentStatus === "submitted"
                  ).length
                  : 0;

            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-all ${filter === f.id
                  ? "bg-[#0F3D24] text-white shadow-md"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
              >
                {f.label} {count > 0 && <span className="ml-1 text-[10px] opacity-80">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {query.isError && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          <strong className="block mb-1">Failed to load pre-orders:</strong>
          {query.error instanceof Error ? query.error.message : "Unknown error occurred"}
        </div>
      )}

      {query.isLoading && <p className="text-center text-sm text-[#0F3D24]/60 py-10">Loading pre-orders...</p>}

      {query.data && (
        <div className="space-y-4">
          {(() => {
            const list = query.data.preorders.filter((o: any) => {
              if (filter === "awaiting_approval") {
                return o.payments?.some((p: any) => !p.confirmedByAdmin) || o.paymentStatus === "submitted";
              }
              return true;
            });
            return (
              <>
                {list.map((o: any) => (
                  <PreorderRow
                    key={o.id}
                    preorder={o}
                    passcode={passcode}
                    role={query.data.role}
                    batches={batchesQuery.data || []}
                    onSaved={() => query.refetch()}
                  />
                ))}
                {list.length === 0 && (
                  <p className="text-center text-sm text-[#0F3D24]/60 py-10">
                    No pre-orders found matching your filters.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PreorderRow({ preorder, passcode, role, batches, onSaved }: { preorder: any; passcode: string; role: string; batches?: FarmBatch[]; onSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState(preorder.deliveryStatus);
  const [customNote, setCustomNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(preorder.customerName);
  const [phone, setPhone] = useState(preorder.phone);
  const [address, setAddress] = useState(preorder.address);
  const [notes, setNotes] = useState(preorder.notes ?? "");
  const [showReminderModal, setShowReminderModal] = useState(false);

  const updateDeliveryFn = useServerFn(adminUpdatePreorderDelivery);
  const addPaymentFn = useServerFn(adminAddPreorderPayment);
  const correctFn = useServerFn(adminCorrectPreorder);
  const deleteFn = useServerFn(adminDeletePreorder);
  const confirmPaymentFn = useServerFn(adminConfirmPreorderPayment);
  const deletePaymentFn = useServerFn(adminDeletePreorderPayment);
  const assignPreorderBatchFn = useServerFn(adminAssignPreorderBatch);

  const assignBatchMut = useMutation({
    mutationFn: (batchId: string | null) => assignPreorderBatchFn({ data: { passcode, id: preorder.id, batchId } }),
    onSuccess: () => onSaved(),
  });

  const mutation = useMutation({
    mutationFn: () => updateDeliveryFn({ data: { passcode, preorderId: preorder.id, deliveryStatus } }),
    onSuccess: () => onSaved(),
  });

  const correctionMutation = useMutation({
    mutationFn: () => correctFn({ data: { passcode, preorderId: preorder.id, customerName, phone, address, notes: notes || null } }),
    onSuccess: () => { setEditing(false); onSaved(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFn({ data: { passcode, preorderId: preorder.id } }),
    onSuccess: onSaved,
  });

  const dirty = deliveryStatus !== preorder.deliveryStatus;

  const getWaLink = (overrides?: any) => {
    const status = overrides?.deliveryStatus ?? preorder.deliveryStatus;
    const digits = preorder.phone.replace(/\D+/g, "");
    const first = preorder.customerName.split(" ")[0];
    let msg = `Hi ${first}, your December pre-order ${preorder.preorderCode} status update:\n`;
    if (status === "delivered") {
      msg += "Your order has been delivered! Thank you for choosing Dignity Agro Farms. Happy Holidays!";
    } else {
      msg += "Your order is pending delivery. We will reach out when it is ready.";
    }
    if (customNote) msg += `\nNote: ${customNote}`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const saveAndNotify = () => {
    window.open(getWaLink({ deliveryStatus }), "_blank", "noopener,noreferrer");
    mutation.mutate();
  };

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/10 transition-all overflow-hidden">
      {/* Collapsed Header Button */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full text-left p-4 sm:p-5 flex flex-col gap-3 transition-colors ${expanded ? "bg-[#F7F5F0]/60 border-b border-[#0F3D24]/10" : "hover:bg-[#F7F5F0]/30"
          }`}
      >
        {/* Top Row: Code, Badges & Chevron */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base sm:text-lg font-extrabold text-[#3F8F3F]">{preorder.preorderCode}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 ring-1 ring-amber-300">
              🎄 December Pre-Order
            </span>
            {preorder.batchName ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                <Layers size={12} /> {preorder.batchName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                Unassigned Batch
              </span>
            )}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#0F3D24]/70 ring-1 ring-[#0F3D24]/10 ml-auto">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {/* Second Row: Customer Details */}
        <div className="space-y-0.5">
          <div className="text-sm">
            <span className="font-bold text-[#0F3D24]">{preorder.customerName}</span> ·{" "}
            <a
              href={`tel:${preorder.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[#3F8F3F] font-semibold hover:underline"
            >
              {preorder.phone}
            </a>
          </div>
          <div className="text-xs text-[#0F3D24]/70 truncate max-w-md">{preorder.address}</div>
          {preorder.notes && <div className="text-xs italic text-[#0F3D24]/60">"{preorder.notes}"</div>}
        </div>

        {/* Third Row: Financial & Reservation Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#0F3D24]/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {preorder.reservationType.replace("_", " ")}
            </span>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${preorder.paymentStatus === "fully_paid" ? "bg-emerald-100 text-emerald-800" :
              preorder.paymentStatus === "partially_paid" ? "bg-amber-100 text-amber-800" :
                "bg-slate-100 text-slate-600"
              }`}>
              {preorder.paymentStatus.replace("_", " ")}
            </span>
          </div>

          <div className="text-xs flex items-center gap-3 font-medium">
            <span className="text-[#0F3D24]">Total: <strong>₦{preorder.totalAmount.toLocaleString()}</strong></span>
            <span className="text-[#3F8F3F]">Paid: <strong>₦{preorder.amountPaid.toLocaleString()}</strong></span>
            <span className="text-red-600">Bal: <strong>₦{preorder.balance.toLocaleString()}</strong></span>
          </div>
        </div>
      </button>

      {/* Expanded Operational Section Body */}
      {expanded && (
        <div className="p-5 sm:p-6 space-y-4">
          {/* Move to Batch Dropdown Control */}
          {batches && batches.length > 0 && role !== "staff" && (
            <div className="flex items-center gap-2 text-xs bg-[#F7F5F0] p-3 rounded-2xl ring-1 ring-[#0F3D24]/10">
              <span className="font-bold text-[#0F3D24]">Move to Batch:</span>
              <select
                value={preorder.batchId || ""}
                onChange={(e) => assignBatchMut.mutate(e.target.value || null)}
                disabled={assignBatchMut.isPending}
                className="rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                <option value="">Unassigned</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType})
                  </option>
                ))}
              </select>
              {assignBatchMut.isPending && <Loader2 size={12} className="animate-spin text-[#3F8F3F]" />}
            </div>
          )}

          <div className="rounded-2xl bg-[#F7F5F0] p-4 text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-[#0F3D24]">{preorder.product} × {preorder.quantity}</span>
            </div>
            {preorder.preferredDeliveryDate && (
              <div className="flex justify-between text-xs text-[#0F3D24]/70 pt-1 border-t border-[#0F3D24]/5">
                <span>Preferred Delivery Date</span>
                <span className="font-semibold text-[#0F3D24]">{new Date(preorder.preferredDeliveryDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {preorder.payments && preorder.payments.length > 0 && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#0F3D24]/10 space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/60">Payment Installments</h4>
              <div className="space-y-2">
                {preorder.payments.map((p: any, i: number) => (
                  <div key={p.id} className={`flex flex-col gap-2 sm:flex-row sm:items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0 ${p.confirmedByAdmin ? "border-[#0F3D24]/5" : "border-amber-200 bg-amber-50 rounded-xl p-3"}`}>
                    <div>
                      <div className={`font-semibold ${p.confirmedByAdmin ? "text-[#0F3D24]" : "text-amber-800"}`}>₦{p.amount.toLocaleString()} {p.confirmedByAdmin ? "" : "(Pending Approval)"}</div>
                      <div className="text-[10px] text-[#0F3D24]/60">{new Date(p.paymentDate).toLocaleDateString()} · Ref: {p.paymentReference}</div>
                    </div>
                    {p.confirmedByAdmin ? (
                      <button
                        onClick={async () => {
                          setDownloadingPdf(p.id);
                          try {
                            // find the visual index of this confirmed payment among other confirmed payments
                            const visualIndex = preorder.payments.filter((x: any) => x.confirmedByAdmin).findIndex((x: any) => x.id === p.id) + 1;
                            await downloadPdf(preorderPaymentReceiptHtml(preorder, p, visualIndex), `receipt_${preorder.preorderCode}_${p.amount}.pdf`);
                          } catch (e: any) {
                            alert("PDF Error: " + (e.message || String(e)));
                          } finally {
                            setDownloadingPdf(null);
                          }
                        }}
                        disabled={downloadingPdf === p.id}
                        className="flex items-center gap-1 rounded bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#3F8F3F] hover:bg-[#3F8F3F]/10 disabled:opacity-50 transition-all"
                      >
                        {downloadingPdf === p.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {downloadingPdf === p.id ? "Preparing PDF..." : "Receipt PDF"}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await confirmPaymentFn({ data: { passcode, paymentId: p.id } });
                            onSaved();
                          }}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("Reject this payment?")) {
                              await deletePaymentFn({ data: { passcode, paymentId: p.id } });
                              onSaved();
                            }
                          }}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
              Delivery Status
              <select
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0] px-3 py-2 text-sm font-semibold outline-none focus:border-[#3F8F3F]"
              >
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
              WhatsApp Note (optional)
              <input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. ETA tomorrow afternoon"
                className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#3F8F3F]"
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={() => mutation.mutate()}
                disabled={!dirty || mutation.isPending}
                className="w-full rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50 sm:w-auto"
              >
                {mutation.isPending ? "Saving…" : "Save Only"}
              </button>
            </div>
          </div>

          {mutation.isError && <p className="mt-2 text-sm text-red-600">{(mutation.error as Error).message}</p>}
          {mutation.isSuccess && !dirty && <p className="mt-2 text-sm text-[#3F8F3F]">Saved.</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#0F3D24]/10 pt-4">
            <button
              onClick={saveAndNotify}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1eb856] disabled:opacity-50"
            >
              <MessageCircle size={16} /> {dirty ? "Save & notify on WhatsApp" : "Notify customer on WhatsApp"}
            </button>
            <button
              type="button"
              onClick={() => setShowReminderModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <MessageSquare size={16} /> Send SMS / Payment Reminder
            </button>
            <button
              type="button"
              onClick={() => {
                const cleanPhone = preorder.phone.replace(/\D+/g, "");
                const waPhone = cleanPhone.startsWith("0") ? "234" + cleanPhone.slice(1) : cleanPhone;
                const text = `🎄 *Dignity Agro Farms December Pre-Order Statement*\n\nCustomer: ${preorder.customerName}\nPre-Order Code: ${preorder.preorderCode}\nProduct: ${preorder.product} × ${preorder.quantity}\nTotal Amount: ₦${preorder.totalAmount.toLocaleString()}\nAmount Paid: ₦${preorder.amountPaid.toLocaleString()}\nBalance Outstanding: ₦${preorder.balance.toLocaleString()}\n\nPayment Bank: Moniepoint MFB · 4006179439\nOrder Policy: https://dignityagrofarms.com/order-policy\n\nThank you for pre-ordering with Dignity Agro Farms!`;
                window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366]/15 px-4 py-2 text-xs font-bold text-[#0F3D24] ring-1 ring-[#25D366]/30 hover:bg-[#25D366]/25 transition"
            >
              <Share2 size={14} className="text-[#25D366]" /> Share Receipt to WhatsApp
            </button>
            <a
              href={getWaLink()}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-[#0F3D24]/60 underline hover:text-[#0F3D24]"
            >
              Open message
            </a>
            <button
              onClick={async () => {
                const amt = prompt("Enter amount to add manually (e.g. 3500):");
                if (!amt) return;
                const ref = prompt("Enter payment reference (optional):");
                try {
                  await addPaymentFn({ data: { passcode, preorderId: preorder.id, amount: parseInt(amt, 10), paymentReference: ref || `MANUAL_ADD_${Date.now()}` } });
                  onSaved();
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Failed to add manual payment");
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white"
            >
              <span className="text-emerald-700">＋ Add manual payment</span>
            </button>
            {role === "owner" && (
              <>
                <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white"><Pencil size={14} /> {editing ? "Close correction" : "Correct details"}</button>
                <button type="button" disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Delete pre-order ${preorder.preorderCode}? This cannot be undone.`)) deleteMutation.mutate(); }} className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"><Trash2 size={14} /> Delete pre-order</button>
              </>
            )}
            <div className="w-full mt-2">
              <button
                onClick={async () => {
                  setDownloadingPdf("complete");
                  try {
                    await downloadPdf(preorderCompleteReceiptHtml(preorder, preorder.payments?.filter((p: any) => p.confirmedByAdmin) || []), `complete_receipt_${preorder.preorderCode}.pdf`);
                  } catch (e: any) {
                    alert("PDF Error: " + (e.message || String(e)));
                  } finally {
                    setDownloadingPdf(null);
                  }
                }}
                disabled={downloadingPdf === "complete"}
                className="inline-flex items-center gap-2 rounded-full bg-[#3F8F3F]/10 px-4 py-2 text-xs font-bold text-[#0F3D24] ring-1 ring-[#3F8F3F]/30 hover:bg-[#3F8F3F]/20 disabled:opacity-50 transition-all"
              >
                {downloadingPdf === "complete" ? <Loader2 size={14} className="text-[#3F8F3F] animate-spin" /> : <FileText size={14} className="text-[#3F8F3F]" />}
                {downloadingPdf === "complete" ? "Generating Master PDF..." : "Download Complete Receipt PDF"}
              </button>
            </div>
          </div>

          {role === "owner" && editing && (
            <div className="mt-4 grid gap-3 rounded-2xl bg-[#F7F5F0] p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F] sm:col-span-2">Address<input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]" /></label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F] sm:col-span-2">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 block min-h-20 w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]" /></label>
              <button type="button" disabled={correctionMutation.isPending} onClick={() => correctionMutation.mutate()} className="rounded-full bg-[#3F8F3F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{correctionMutation.isPending ? "Saving correction…" : "Save correction"}</button>
              {correctionMutation.isError && <p className="text-sm text-red-600 sm:col-span-2">{(correctionMutation.error as Error).message}</p>}
            </div>
          )}
        </div>
      )}
      {showReminderModal && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          targetType="preorder"
          recipientName={preorder.customerName}
          recipientPhone={preorder.phone}
          orderCode={preorder.preorderCode}
          totalAmount={preorder.totalAmount}
          amountPaid={preorder.amountPaid}
          balance={preorder.balance}
          notes={preorder.notes}
        />
      )}
    </div>
  );
}