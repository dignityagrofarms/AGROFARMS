import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, RefreshCw, ShieldCheck, MessageCircle, CheckCircle2, XCircle, Clock, Download, FileText, Search, Ban, AlertTriangle, FileArchive, Users, TicketPercent, Copy, ImageDown, Share2, Sparkles, X, Pencil, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { PwaInstallPrompt } from "@/components/site/PwaInstallPrompt";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import { receiptHtml } from "@/lib/receipt-html";
import { adminListOrders, adminUpdateOrder, adminDecidePayment, adminGetPasscode, adminSetPasscode, adminListClients, adminListVouchers, adminCreateVoucher, adminToggleVoucher, adminCorrectOrder, adminDeleteOrder, type AdminOrder, type ClientRecord, type AdminVoucher, type AdminRole } from "@/lib/orders.functions";

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
    `Hi ${o.customerName.split(" ")[0]}, your order ${o.orderCode} has been cancelled.${o.statusNote ? ` Reason: ${o.statusNote}` : ""} Please contact us on 07083476366 if you have questions.`,
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
    `Thank you for patronising Dignity Agro Farms. We hope you enjoy your farm-fresh order, and we'd love to serve you again! 070 8347 6366`;
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
      ? `Hi ${first}, this is Dignity Agro Farms. Your payment of ${naira(order.total)} for order ${order.orderCode} has been CONFIRMED. ✅\nCurrent status: ${STATUS_LABEL[order.status]}.${order.eta ? ` ETA: ${order.eta}.` : ""}\nTrack your order anytime on our website with your tracking code ${order.trackCode}. Thank you!`
      : `Hi ${first}, this is Dignity Agro Farms. We could not confirm your payment of ${naira(order.total)} for order ${order.orderCode}.${reason ? ` Reason: ${reason}.` : ""}\nCurrent status: ${STATUS_LABEL[order.status]}.\nPlease send payment to 7083476366 (Opay · Ihemegbulem) only, then tap "I have made payment" again. Call 07083476366 for help.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function AdminOrders() {
  const [passcode, setPasscode] = useState<string | null>(null);
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
  const [reasonFilter, setReasonFilter] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "clients" | "vouchers" | "flyers">("orders");
  const [applied, setApplied] = useState({ from: "", to: "", status: "", paymentStatus: "", zone: "", search: "" });
  const listFn = useServerFn(adminListOrders);
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setPasscode(saved);
    }
  }, []);

  const query = useQuery({
    queryKey: ["admin-orders", passcode, applied],
    queryFn: () => listFn({ data: { passcode: passcode!, ...applied } }),
    enabled: !!passcode,
    refetchInterval: 20000,
    retry: false,
  });

  const applyFilters = () => {
    setApplied({ from, to, status: statusFilter, paymentStatus: payFilter, zone: zoneFilter, search: search.trim() });
    setFilter("all");
  };

  const setRange = (days: number | "month") => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const start = days === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getTime() - (days - 1) * 86400000);
    setFrom(iso(start));
    setTo(iso(now));
    setApplied({ from: iso(start), to: iso(now), status: statusFilter, paymentStatus: payFilter, zone: zoneFilter, search: search.trim() });
    setFilter("all");
  };

  const resetFilters = () => {
    setFrom(""); setTo(""); setStatusFilter(""); setPayFilter(""); setZoneFilter(""); setSearch("");
    setReasonFilter("");
    setApplied({ from: "", to: "", status: "", paymentStatus: "", zone: "", search: "" });
  };

  useEffect(() => {
    if (query.error && passcode) {
      setAuthError((query.error as Error).message);
      sessionStorage.removeItem(STORAGE_KEY);
      setPasscode(null);
    }
  }, [query.error, passcode]);

  const signOut = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPasscode(null);
    qc.removeQueries({ queryKey: ["admin-orders"] });
  };

  const submitPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const p = input;
    const u = username.trim().toLowerCase();
    if (!u || !p) return;
    const credential = JSON.stringify({ username: u, passcode: p });
    sessionStorage.setItem(STORAGE_KEY, credential);
    setPasscode(credential);
    setInput("");
    setUsername("");
  };

  return (
    <SiteLayout>
      <PwaInstallPrompt />
      <section className="bg-[#0F3D24] py-12 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Owner and staff portal</span>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Order Management</h1>
          </div>
          {passcode && (
            <div className="flex gap-2">
              <button onClick={() => setShowSettings((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                <ShieldCheck size={14} /> Passcode
              </button>
              <button onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                <RefreshCw size={14} /> Refresh
              </button>
              <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {passcode && showSettings && (
          <PasscodePanel
            passcode={passcode}
            onChanged={(next) => {
              sessionStorage.setItem(STORAGE_KEY, next);
              setPasscode(next);
            }}
          />
        )}
        {passcode && (
          <div className="mb-6 flex flex-wrap gap-2 border-b border-[#0F3D24]/10 pb-3" role="tablist" aria-label="Admin sections">
            {query.data?.role && <span className="inline-flex items-center rounded-full bg-[#3F8F3F]/10 px-4 py-2.5 text-xs font-semibold text-[#0F3D24]">Signed in as {query.data.role}</span>}
            <AdminTab active={activeTab === "orders"} onClick={() => setActiveTab("orders")} icon={<FileText size={15} />}>Orders and reports</AdminTab>
            <AdminTab active={activeTab === "clients"} onClick={() => setActiveTab("clients")} icon={<Users size={15} />}>Client CRM</AdminTab>
            <AdminTab active={activeTab === "vouchers"} onClick={() => setActiveTab("vouchers")} icon={<TicketPercent size={15} />}>Discount vouchers</AdminTab>
             <AdminTab active={activeTab === "flyers"} onClick={() => setActiveTab("flyers")} icon={<Sparkles size={15} />}>Social proof flyers</AdminTab>
          </div>
        )}
        {!passcode ? (
          <form onSubmit={submitPasscode} className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5">
            <ShieldCheck className="mx-auto text-[#3F8F3F]" size={40} />
            <h2 className="mt-3 text-center text-xl font-semibold">Admin sign in</h2>
            <p className="mt-1 text-center text-sm text-[#0F3D24]/70">Sign in with your owner or staff username and passcode.</p>
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
            <button className="mt-4 w-full rounded-full bg-[#0F3D24] px-5 py-3 text-sm font-semibold text-white hover:bg-[#134a2c]">
              Sign in
            </button>
            <p className="mt-4 text-center text-xs text-[#0F3D24]/55">Owner access can review or change the staff passcode from the Passcode panel.</p>
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
              <FilterBtn active={filter === "awaiting"} onClick={() => setFilter("awaiting")} count={scoped.filter(o => o.paymentStatus === "submitted").length}>
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
          <div className="space-y-4">
            {(() => {
              const all = scoped;
              const filtered =
                filter === "awaiting" ? all.filter((o) => o.paymentStatus === "submitted")
                : filter === "cancelled_customer" ? all.filter((o) => o.status === "cancelled" && o.cancelledBy === "customer")
                : filter === "cancelled_admin" ? all.filter((o) => o.status === "cancelled" && o.cancelledBy !== "customer")
                : filter === "not_completed" ? all.filter(isNotCompleted)
                : all;
              if (filtered.length === 0) return <p className="text-center text-[#0F3D24]/60">No orders to show.</p>;
              return filtered.map((order) => (
              <OrderRow key={order.id} order={order} passcode={passcode} role={role} onSaved={() => query.refetch()} />
              ));
            })()}
          </div>
             </>
             ) : activeTab === "clients" ? (
               <ClientCrmPanel passcode={passcode} />
              ) : activeTab === "vouchers" ? (
               <VoucherPanel passcode={passcode} />
              ) : (
                <SocialProofPanel orders={allOrders} />
             )}
          </>
          );
          })()
        ) : null}
      </section>
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
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition ${active ? "bg-[#0F3D24] text-white" : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-[#F7F5F0]"}`}
    >
      {icon} {children}
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
    retry: false,
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
  const [message, setMessage] = useState<string | null>(null);
  const listFn = useServerFn(adminListVouchers);
  const createFn = useServerFn(adminCreateVoucher);
  const toggleFn = useServerFn(adminToggleVoucher);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-vouchers", passcode], queryFn: () => listFn({ data: { passcode } }), retry: false });
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
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#3F8F3F]/10 text-[#3F8F3F]"><TicketPercent size={20} /></div><div><div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Discount vouchers</div><h2 className="mt-1 text-2xl font-semibold text-[#0F3D24]">Create and manage offers</h2><p className="mt-1 text-sm text-[#0F3D24]/65">Generate a code for a customer, set its limits, and switch it off when the offer ends.</p></div></div>
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
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={!canCreate} onClick={() => createMutation.mutate()} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50"><TicketPercent size={15} /> {createMutation.isPending ? "Creating..." : "Create voucher"}</button>{message && <span className="text-sm font-semibold text-[#0F3D24]/75">{message}</span>}</div>
      </div>

      {query.isLoading ? <p className="py-10 text-center text-sm text-[#0F3D24]/60">Loading vouchers...</p> : query.error ? <p className="py-10 text-center text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Could not load vouchers."}</p> : vouchers.length === 0 ? <p className="py-10 text-center text-sm text-[#0F3D24]/60">No vouchers created yet.</p> : (
        <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-[#0F3D24]/10"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-[#F7F5F0] text-[10px] uppercase tracking-widest text-[#0F3D24]/60"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Offer</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Uses</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-[#0F3D24]/10">{vouchers.map((voucher) => <tr key={voucher.id}><td className="px-4 py-4"><div className="flex items-center gap-2 font-mono font-semibold text-[#3F8F3F]">{voucher.code}<button type="button" title="Copy voucher code" aria-label={`Copy ${voucher.code}`} onClick={() => void navigator.clipboard.writeText(voucher.code)} className="text-[#0F3D24]/50 hover:text-[#3F8F3F]"><Copy size={14} /></button></div>{voucher.note && <div className="mt-1 text-xs text-[#0F3D24]/55">{voucher.note}</div>}</td><td className="px-4 py-4 font-semibold text-[#0F3D24]">{voucher.discountType === "percent" ? `${voucher.discountValue}% off` : `${naira(voucher.discountValue)} off`}</td><td className="px-4 py-4 text-[#0F3D24]/70">{voucher.recipientName || "Any customer"}{voucher.recipientPhone && <span className="block text-xs">{voucher.recipientPhone}</span>}</td><td className="px-4 py-4 text-[#0F3D24]/70">{voucher.usesCount}{voucher.maxUses ? ` / ${voucher.maxUses}` : " / unlimited"}</td><td className="px-4 py-4 text-[#0F3D24]/70">{voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : "No expiry"}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${voucher.active ? "bg-[#3F8F3F]/10 text-[#0F3D24]" : "bg-[#F7F5F0] text-[#0F3D24]/55"}`}>{voucher.active ? "Active" : "Inactive"}</span></td><td className="px-4 py-4"><button type="button" disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate(voucher)} className="rounded-full bg-[#F7F5F0] px-3 py-1.5 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10 hover:bg-white">{voucher.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
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

function OrderRow({ order, passcode, role, onSaved }: { order: AdminOrder; passcode: string; role: AdminRole; onSaved: () => void }) {
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
  // window.open must be called synchronously in the click handler to avoid popup blocking.
  const saveAndNotify = () => {
    window.open(
      waLink(order, { status, statusNote: note || null, eta: eta || null }),
      "_blank",
      "noopener,noreferrer",
    );
    // Delivered orders also get a plain SMS thank-you to the customer's phone.
    if (status === "delivered") {
      window.location.href = thankYouSms({ ...order, status });
    }
    mutation.mutate();
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-mono text-lg font-semibold">{order.orderCode}</div>
          <div className="mt-1 text-sm">
            <span className="font-semibold">{order.customerName}</span> · <a className="text-[#3F8F3F]" href={`tel:${order.phone}`}>{order.phone}</a>
          </div>
          <div className="mt-1 text-sm text-[#0F3D24]/70">{order.address} · {order.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri"}</div>
          {order.notes && <div className="mt-2 text-xs italic text-[#0F3D24]/60">"{order.notes}"</div>}
          {order.status === "cancelled" && (
            <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
              <Ban size={14} />
              {order.cancelledBy === "customer" ? "Cancelled by customer" : "Cancelled by farm"}
              {order.cancelReason ? `: ${order.cancelReason}` : ""}
              {order.cancelledAt ? ` · ${new Date(order.cancelledAt).toLocaleString()}` : ""}
            </div>
          )}
          {isNotCompleted(order) && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <AlertTriangle size={14} /> Not completed: no payment for over 24h
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-[#0F3D24]/60">Total</div>
          <div className="text-lg font-semibold">{naira(order.total)}</div>
          <div className="text-xs text-[#0F3D24]/60">{new Date(order.createdAt).toLocaleString()}</div>
        </div>
      </div>

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

      <div className="mt-4 rounded-2xl bg-[#F7F5F0] p-3 text-sm">
        {order.items.map((it, i) => (
          <div key={i} className="flex justify-between">
            <span>{it.product} · {it.option} × {it.qty}</span>
            <span className="text-[#0F3D24]/70">{naira(it.unitPrice * it.qty)}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between text-xs text-[#0F3D24]/60">
          <span>Delivery</span>
          <span>{order.deliveryFee === 0 ? "FREE" : naira(order.deliveryFee)}</span>
        </div>
      </div>

      <OrderTimeline order={order} />

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminOrder["status"])}
            className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
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
            className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]"
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={() => mutation.mutate()}
            disabled={!dirty || mutation.isPending}
            className="w-full rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-50 sm:w-auto"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
        <label className="sm:col-span-3 text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
          Note to customer (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Rider just left the farm"
            className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]"
          />
        </label>
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
        <a
          href={waLink(order)}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-[#0F3D24]/60 underline hover:text-[#0F3D24]"
        >
          Resend saved status only
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
        {dirty && (
          <span className="text-xs text-[#0F3D24]/60">
            One tap: saves the new status and opens WhatsApp with the message.
          </span>
        )}
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