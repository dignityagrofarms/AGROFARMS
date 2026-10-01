import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PackageSearch, CheckCircle2, Truck, Home, Clock, XCircle, RefreshCw, CreditCard, AlertTriangle, FileText, Ban, CalendarClock, Leaf } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { trackUnified, cancelOrderByCustomer, recoverCodesByPhone, type TrackedOrder, type TrackedPreorder } from "@/lib/orders.functions";
import { OrderTimeline } from "@/components/site/OrderTimeline";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Your Order · Dignity Agro Farms" },
      { name: "description", content: "Track the status of your live broiler or dressed chicken order from Dignity Agro Farms." },
      { property: "og:title", content: "Track Your Order · Dignity Agro Farms" },
      { property: "og:description", content: "See where your farm-fresh chicken order is right now." },
    ],
  }),
  component: TrackOrder,
});

const STAGES = [
  { key: "received", icon: CheckCircle2, label: "Order Received", desc: "We got your order and confirmed the details." },
  { key: "preparing", icon: PackageSearch, label: "Being Prepared", desc: "Your bird is being selected, weighed and packed." },
  { key: "out_for_delivery", icon: Truck, label: "Out for Delivery", desc: "Our rider is on the way to your address." },
  { key: "delivered", icon: Home, label: "Delivered", desc: "Enjoy your farm-fresh chicken!" },
] as const;

const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");

function stageIndex(status: TrackedOrder["status"]) {
  const i = STAGES.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

function TrackOrder() {
  const [codeInput, setCodeInput] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const trackFn = useServerFn(trackUnified);

  const query = useQuery({
    queryKey: ["track-unified", activeCode],
    queryFn: () => trackFn({ data: { trackCode: activeCode! } }),
    enabled: !!activeCode,
    refetchInterval: 15000,
  });

  const [phoneMode, setPhoneMode] = useState(false);
  const recoverFn = useServerFn(recoverCodesByPhone);
  const phoneMutation = useMutation({
    mutationFn: (p: string) => recoverFn({ data: { phone: p } }),
  });

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const p = codeInput.trim().toUpperCase();
    if (!p) return;
    // If it looks like a phone number (digits only, or starts with 0/+), do phone lookup
    const isPhone = /^[0-9+\s]{7,}$/.test(codeInput.trim());
    if (isPhone) {
      setPhoneMode(true);
      phoneMutation.mutate(codeInput.trim());
    } else {
      setPhoneMode(false);
      setActiveCode(p);
    }
  };

  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Order Tracking</span>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Track Your Order</h1>
          <p className="mt-4 text-white/80">Enter your order number (e.g. DAF-12345 or DEC-12345), or simply type your <strong>phone number</strong> to find your orders. Status refreshes automatically every 15 seconds.</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <form onSubmit={handleTrack} className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:flex-row">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            type="text"
          placeholder="Order number (DAF-12345) or phone number"
            className="flex-1 rounded-full border border-[#0F3D24]/15 bg-white px-5 py-3 text-sm tracking-wider outline-none ring-[#3F8F3F] focus:ring-2"
          />
          <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3F8F3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4ea94e]">
            <PackageSearch size={16} /> Track Order
          </button>
        </form>

        <RecoverBox onPick={(c: string) => { setCodeInput(c); setActiveCode(c); }} />

        {phoneMode && (
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
            {phoneMutation.isPending && <p className="text-sm text-[#0F3D24]/70">Searching for your orders…</p>}
            {phoneMutation.data && (
              phoneMutation.data.codes.length === 0 ? (
                <p className="text-sm text-[#0F3D24]/70">No orders found for that phone number. Please check the number or call us on <a className="font-semibold text-[#3F8F3F]" href="tel:+2348167099492">081 6709 9492</a>.</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[#0F3D24]">Orders found for your number — tap one to track it:</p>
                  <ul className="mt-3 space-y-2">
                    {phoneMutation.data.codes.map((c) => (
                      <li key={c.code}>
                        <button
                          onClick={() => { setPhoneMode(false); setCodeInput(c.code); setActiveCode(c.code); }}
                          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F7F5F0] px-4 py-3 text-left text-sm ring-1 ring-[#0F3D24]/10 hover:ring-[#3F8F3F]/40"
                        >
                          <span className="font-mono font-semibold text-[#3F8F3F]">{c.code}</span>
                          <span suppressHydrationWarning className="text-xs text-[#0F3D24]/60">{new Date(c.createdAt).toLocaleDateString()} · {naira(c.total)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )
            )}
            {phoneMutation.isError && <p className="mt-2 text-xs text-red-600">{(phoneMutation.error as Error).message}</p>}
          </div>
        )}

        {activeCode && !phoneMode && (
          <div className="mt-6 flex items-center justify-between text-sm text-[#0F3D24]/70">
            <span>
              {query.isFetching ? "Refreshing…" : query.data ? (query.data.result ? "Order found" : "") : ""}
            </span>
            <button onClick={() => query.refetch()} className="inline-flex items-center gap-1 text-[#3F8F3F] hover:underline">
              <RefreshCw size={14} /> Refresh now
            </button>
          </div>
        )}

        {query.isError && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            Could not load orders. Please try again in a moment.
          </div>
        )}

        {query.data && !query.data.result && (
          <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-[#0F3D24]/5">
            <p className="text-[#0F3D24]/70">No order found for that tracking code. Please check the code on your order confirmation, or call us on <a className="font-semibold text-[#3F8F3F]" href="tel:+2348167099492">081 6709 9492</a>.</p>
          </div>
        )}

        {query.data?.result && (
          query.data.result.type === "preorder"
            ? <PreorderResult preorder={query.data.result} />
            : (() => {
                const order = query.data.result as TrackedOrder & { type: "order" };
                const cancelled = order.status === "cancelled";
                const idx = stageIndex(order.status);
                const paid = order.paymentStatus === "approved";
                return (
                  <div key={order.orderCode} className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Order</div>
                        <div className="font-mono text-2xl font-semibold">{order.orderCode}</div>
                        <div className="mt-1 font-mono text-xs text-[#0F3D24]/60">Tracking / receipt no: {order.orderCode}</div>
                        <div suppressHydrationWarning className="mt-1 text-xs text-[#0F3D24]/60">Placed {new Date(order.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs uppercase tracking-widest text-[#0F3D24]/60">Total</div>
                        <div className="text-xl font-semibold">{naira(order.total)}</div>
                      </div>
                    </div>

                    {/* Customer details card */}
                    {order.customerName && (
                      <div className="mt-4 rounded-2xl bg-[#F7F5F0] p-4 text-sm ring-1 ring-[#0F3D24]/8">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-2">Order placed by</div>
                        <div className="font-semibold text-[#0F3D24]">{order.customerName}</div>
                        {order.phone && <div className="mt-0.5 text-[#0F3D24]/70">{order.phone}</div>}
                        {order.address && <div className="mt-0.5 text-xs text-[#0F3D24]/60">{order.address}</div>}
                      </div>
                    )}

                    <PaymentBadge status={order.paymentStatus} reason={order.paymentRejectionReason} />

                    {order.eta && !cancelled && paid && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-[#a8e6a8]">
                        <Clock size={14} /> ETA: {order.eta}
                      </div>
                    )}

                    <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-4 text-sm">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex flex-wrap justify-between gap-2">
                          <span className="font-medium text-[#0F3D24]">{it.product} · {it.option} × {it.qty}</span>
                          <span className="text-[#0F3D24]/70">{naira(it.unitPrice * it.qty)}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between text-xs text-[#0F3D24]/60">
                        <span>Delivery ({order.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri"})</span>
                        <span>{order.deliveryFee === 0 ? "FREE" : naira(order.deliveryFee)}</span>
                      </div>
                    </div>

                    {cancelled ? (
                      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
                        <XCircle className="mt-0.5 shrink-0 text-red-600" size={20} />
                        <div>
                          <div className="font-semibold text-red-700">Order cancelled</div>
                          <p className="mt-1 text-sm text-red-700/80">
                            {order.cancelledBy === "customer" ? "You cancelled this order." : "This order was cancelled by the farm."}
                            {order.cancelReason ? ` Reason: ${order.cancelReason}` : order.statusNote ? ` ${order.statusNote}` : ""}
                          </p>
                        </div>
                      </div>
                    ) : !paid ? (
                      <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-5 ring-1 ring-[#0F3D24]/10">
                        <div className="flex items-start gap-3">
                          <CreditCard className="mt-0.5 shrink-0 text-[#0F3D24]" size={20} />
                          <div className="text-sm text-[#0F3D24]">
                            <p className="font-semibold">Waiting for payment confirmation</p>
                            <p className="mt-1 text-[#0F3D24]/70">Delivery tracking unlocks after admin approves your payment. If you have already paid, an admin is checking the bank alert now.</p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl bg-[#0F3D24] p-4 text-sm text-white">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8e6a8]">Send payment to</p>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                            <span className="text-white/60">Moniepoint MFB</span><span className="text-right font-semibold">Dignity Agro Farms</span>
                            <span className="text-white/60">Account</span><span className="text-right font-mono font-semibold">4006179439</span>
                            <span className="text-white/60">Amount</span><span className="text-right font-semibold">{naira(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ol className="mt-6 space-y-3">
                        {STAGES.map((s, i) => {
                          const done = i <= idx;
                          const current = i === idx;
                          const Icon = s.icon;
                          return (
                            <li key={s.key} className={`flex gap-4 rounded-2xl p-4 ring-1 ${done ? "bg-[#F7F5F0] ring-[#3F8F3F]/30" : "bg-white ring-[#0F3D24]/5"}`}>
                              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${done ? "bg-[#3F8F3F] text-white" : "bg-[#0F3D24]/10 text-[#0F3D24]/40"}`}>
                                <Icon size={20} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold ${done ? "text-[#0F3D24]" : "text-[#0F3D24]/50"}`}>
                                  {s.label} {current && <span className="ml-2 rounded-full bg-[#3F8F3F] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">Now</span>}
                                </div>
                                <p className={`text-sm ${done ? "text-[#0F3D24]/70" : "text-[#0F3D24]/40"}`}>{s.desc}</p>
                                {current && order.statusNote && (
                                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-[#0F3D24] ring-1 ring-[#3F8F3F]/20">{order.statusNote}</p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    <p suppressHydrationWarning className="mt-4 text-right text-[10px] uppercase tracking-widest text-[#0F3D24]/40">
                      Last updated {new Date(order.updatedAt).toLocaleTimeString()}
                    </p>

                    <OrderTimeline order={order} />

                    {!cancelled && (
                      <CancelBox order={order} onDone={() => query.refetch()} />
                    )}

                    <div className="mt-4 flex justify-end border-t border-[#0F3D24]/10 pt-4 gap-3">
                      <Link
                        to="/receipt/$orderCode"
                        params={{ orderCode: order.orderCode }}
                        search={{ code: order.trackCode }}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${paid ? "bg-[#0F3D24] text-white hover:bg-[#134a2c]" : "bg-white text-[#0F3D24] ring-1 ring-[#0F3D24]/15 hover:bg-[#F7F5F0]"}`}
                      >
                        <FileText size={16} /> {paid ? "Download receipt" : "Generate invoice"}
                      </Link>
                    </div>
                  </div>
                );
              })()
        )}

        <div className="mt-10 rounded-3xl bg-[#0F3D24] p-6 text-white">
          <h3 className="text-lg font-semibold">Can't find your order number?</h3>
          <p className="mt-2 text-sm text-white/80">
            Use the "Forgot your order number?" lookup above with the phone number you ordered with. Still stuck? Call us on
            <a href="tel:+2348167099492" className="ml-1 font-semibold text-[#a8e6a8] underline">081 6709 9492</a> and we'll help right away.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}

function PaymentBadge({ status, reason }: { status: TrackedOrder["paymentStatus"]; reason: string | null }) {
  return <PaymentBadgeInner status={status} reason={reason} />;
}

/** Lets a customer recover their order number with the phone they ordered with. */
function RecoverBox({ onPick }: { onPick: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const recoverFn = useServerFn(recoverCodesByPhone);
  const mutation = useMutation({
    mutationFn: (p: string) => recoverFn({ data: { phone: p } }),
  });

  return (
    <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm font-semibold text-[#3F8F3F] hover:underline">
          Forgot your order number?
        </button>
      ) : (
        <div>
          <p className="text-sm font-semibold text-[#0F3D24]">Find your order number</p>
          <p className="mt-1 text-xs text-[#0F3D24]/70">Enter the phone number you used when ordering and we'll show your recent order numbers.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="e.g. 08012345678"
              className="flex-1 rounded-full border border-[#0F3D24]/15 px-5 py-2.5 text-sm outline-none ring-[#3F8F3F] focus:ring-2"
            />
            <button
              onClick={() => phone.trim() && mutation.mutate(phone.trim())}
              disabled={mutation.isPending}
              className="rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-60"
            >
              {mutation.isPending ? "Searching…" : "Find my orders"}
            </button>
          </div>
          {mutation.data && (
            mutation.data.codes.length === 0 ? (
              <p className="mt-3 text-sm text-[#0F3D24]/70">No orders found for that phone number.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mutation.data.codes.map((c) => (
                  <li key={c.code}>
                    <button
                      onClick={() => onPick(c.code)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#F7F5F0] px-4 py-2 text-left text-sm ring-1 ring-[#0F3D24]/10 hover:ring-[#3F8F3F]/40"
                    >
                      <span className="font-mono font-semibold text-[#0F3D24]">{c.code}</span>
                      <span suppressHydrationWarning className="text-xs text-[#0F3D24]/60">
                        {new Date(c.createdAt).toLocaleDateString()} · {naira(c.total)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
          {mutation.isError && <p className="mt-2 text-xs text-red-600">{(mutation.error as Error).message}</p>}
        </div>
      )}
    </div>
  );
}

const CANCEL_REASONS = [
  "I changed my mind",
  "I ordered by mistake",
  "Wrong details on the order",
  "It's taking too long",
  "Other",
];

function CancelBox({ order, onDone }: { order: TrackedOrder; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(CANCEL_REASONS[0]!);
  const [other, setOther] = useState("");
  const cancelFn = useServerFn(cancelOrderByCustomer);

  const allowed =
    (order.status === "received" || order.status === "preparing") && order.paymentStatus !== "approved";

  const mutation = useMutation({
    mutationFn: (finalReason: string) =>
      cancelFn({ data: { trackCode: order.trackCode, reason: finalReason } }),
    onSuccess: () => { setOpen(false); onDone(); },
  });

  const submit = () => {
    const finalReason = (reason === "Other" ? other.trim() : reason) || "No reason given";
    mutation.mutate(finalReason);
  };

  if (!allowed) {
    return (
      <p className="mt-4 border-t border-[#0F3D24]/10 pt-4 text-xs text-[#0F3D24]/60">
        This order can no longer be cancelled online. Please call{" "}
        <a className="font-semibold text-[#3F8F3F]" href="tel:+2348167099492">081 6709 9492</a>.
      </p>
    );
  }

  return (
    <div className="mt-4 border-t border-[#0F3D24]/10 pt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
        >
          <Ban size={16} /> Cancel this order
        </button>
      ) : (
        <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
          <p className="text-sm font-semibold text-red-700">Cancel order {order.orderCode}?</p>
          <p className="mt-1 text-xs text-red-700/80">This cannot be undone. Tell us why so we can improve. The farm is notified automatically, so you do not need to message anyone.</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
          >
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {reason === "Other" && (
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={200}
              placeholder="Tell us briefly"
              className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
            />
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={submit}
              disabled={mutation.isPending}
              className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {mutation.isPending ? "Cancelling…" : "Yes, cancel my order"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#0F3D24]/10">
              Keep my order
            </button>
          </div>
          {mutation.isError && <p className="mt-2 text-xs text-red-700">{(mutation.error as Error).message}</p>}
        </div>
      )}
    </div>
  );
}

function PaymentBadgeInner({ status, reason }: { status: TrackedOrder["paymentStatus"]; reason: string | null }) {
  if (status === "approved") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#3F8F3F]/10 px-3 py-1 text-xs font-semibold text-[#0F3D24] ring-1 ring-[#3F8F3F]/30">
        <CheckCircle2 size={14} className="text-[#3F8F3F]" /> Payment approved
      </div>
    );
  }
  if (status === "submitted") {
    return (
      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
        <Clock size={14} /> Payment submitted, awaiting admin approval
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <AlertTriangle size={14} /> Payment not received{reason ? `. ${reason}` : ""}. Please contact us.
      </div>
    );
  }
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#F7F5F0] px-3 py-1 text-xs font-semibold text-[#0F3D24]/70 ring-1 ring-[#0F3D24]/10">
      <CreditCard size={14} /> Payment pending
    </div>
  );
}

// ─── Preorder result card (shown when a DEC- code is entered) ────────────────

const PAYMENT_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:         { label: "Payment Pending",   cls: "bg-slate-100 text-slate-700" },
  partially_paid:  { label: "Partially Paid",    cls: "bg-amber-100 text-amber-800" },
  fully_paid:      { label: "Fully Paid",        cls: "bg-emerald-100 text-emerald-800" },
};

const RESERVATION_LABELS: Record<string, string> = {
  slot_reserved:    "Slot Reserved (₦3,500 deposit)",
  free_reservation: "Free Reservation",
  outright:         "Outright / Full Payment",
};

function PreorderResult({ preorder }: { preorder: TrackedPreorder }) {
  const payStatus = PAYMENT_STATUS_LABELS[preorder.paymentStatus] ?? { label: preorder.paymentStatus, cls: "bg-slate-100 text-slate-700" };
  const fullyPaid = preorder.paymentStatus === "fully_paid";
  const delivered = preorder.deliveryStatus === "delivered";

  return (
    <div className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Leaf size={14} className="text-[#3F8F3F]" />
            <span className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">December Pre-Order</span>
          </div>
          <div className="font-mono text-2xl font-semibold text-[#0F3D24]">{preorder.preorderCode}</div>
          <div suppressHydrationWarning className="mt-1 text-xs text-[#0F3D24]/60">
            Placed {new Date(preorder.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-[#0F3D24]/60">Total Order</div>
          <div className="text-xl font-semibold text-[#0F3D24]">{naira(preorder.totalAmount)}</div>
        </div>
      </div>

      {/* Payment status badge */}
      <div className="mt-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${payStatus.cls}`}>
          {payStatus.label}
        </span>
        {delivered && (
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-800">
            <CheckCircle2 size={12} /> Delivered
          </span>
        )}
      </div>

      {/* Customer details card */}
      {preorder.customerName && (
        <div className="mt-4 rounded-2xl bg-[#F7F5F0] p-4 text-sm ring-1 ring-[#0F3D24]/8">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-2">Order placed by</div>
          <div className="font-semibold text-[#0F3D24]">{preorder.customerName}</div>
          {preorder.phone && <div className="mt-0.5 text-[#0F3D24]/70">{preorder.phone}</div>}
        </div>
      )}

      {/* Order details */}
      <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-[#0F3D24]/70">Product</span>
          <span className="font-medium text-[#0F3D24] text-right max-w-[60%]">{preorder.product}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#0F3D24]/70">Quantity</span>
          <span className="font-medium text-[#0F3D24]">{preorder.quantity} bird{preorder.quantity !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#0F3D24]/70">Reservation type</span>
          <span className="font-medium text-[#0F3D24] text-right max-w-[60%]">{RESERVATION_LABELS[preorder.reservationType] ?? preorder.reservationType}</span>
        </div>
        {preorder.preferredDeliveryDate && (
          <div className="flex justify-between">
            <span className="text-[#0F3D24]/70">Preferred delivery</span>
            <span suppressHydrationWarning className="font-medium text-[#0F3D24]">
              {new Date(preorder.preferredDeliveryDate).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>

      {/* Payment summary */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-[#F7F5F0] p-3 ring-1 ring-[#0F3D24]/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50">Total</p>
          <p className="mt-1 text-base font-bold text-[#0F3D24]">{naira(preorder.totalAmount)}</p>
        </div>
        <div className="rounded-2xl bg-[#F7F5F0] p-3 ring-1 ring-[#3F8F3F]/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50">Paid</p>
          <p className="mt-1 text-base font-bold text-[#3F8F3F]">{naira(preorder.amountPaid)}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${preorder.balance > 0 ? "bg-amber-50 ring-amber-200" : "bg-emerald-50 ring-emerald-200"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50">Balance</p>
          <p className={`mt-1 text-base font-bold ${preorder.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{naira(preorder.balance)}</p>
        </div>
      </div>

      {/* Balance due prompt */}
      {preorder.balance > 0 && !delivered && (
        <div className="mt-4 rounded-2xl bg-[#0F3D24] p-4 text-sm text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8e6a8]">Complete your payment</p>
          <p className="mt-1 text-white/80 text-xs">You have a balance of {naira(preorder.balance)} remaining. Send it to:</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            <span className="text-white/60">Moniepoint MFB</span><span className="text-right font-semibold">Dignity Agro Farms</span>
            <span className="text-white/60">Account</span><span className="text-right font-mono font-semibold">4006179439</span>
            <span className="text-white/60">Amount</span><span className="text-right font-semibold">{naira(preorder.balance)}</span>
          </div>
          <p className="mt-3 text-xs text-white/60">After payment, go back to the <a href="/order?mode=december" className="text-[#a8e6a8] underline">December Pre-Order page</a> to submit your payment reference.</p>
        </div>
      )}

      {delivered && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-200">
          <Home size={20} className="shrink-0 text-teal-700" />
          <p className="text-sm font-semibold text-teal-800">Your December pre-order has been delivered. Enjoy your chicken! 🎄</p>
        </div>
      )}

      {preorder.notes && (
        <div className="mt-4 rounded-2xl bg-[#F7F5F0] p-4 text-sm text-[#0F3D24]/70 ring-1 ring-[#0F3D24]/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-1">Order notes</p>
          <p>{preorder.notes}</p>
        </div>
      )}

      <p suppressHydrationWarning className="mt-4 text-right text-[10px] uppercase tracking-widest text-[#0F3D24]/40">
        Last updated {new Date(preorder.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}