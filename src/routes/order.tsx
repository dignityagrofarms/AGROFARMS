import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, PhoneCall, ShoppingBag, Copy, AlertTriangle, MessageCircle, CalendarClock, Truck } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { createOrder, markPaymentSubmitted, MIN_ORDER_SUBTOTAL, validateVoucher } from "@/lib/orders.functions";
import { PRODUCTS } from "@/lib/products";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Checkout & Place Order | Dignity Agro Farms" },
      { name: "description", content: "Order live or dressed broilers by the Kg, fresh eggs and more. Transparent pricing with quick home delivery in Owerri town." },
      { property: "og:title", content: "Checkout & Place Order | Dignity Agro Farms" },
      { property: "og:description", content: "Pick your product, choose your Kg, and see your total instantly. Free delivery within Owerri town." },
      { property: "og:url", content: "/order" },
      { property: "og:image", content: "https://dignityagrofarms.com/favicon.png" },
    ],
    links: [{ rel: "canonical", href: "/order" }],
  }),
  component: OrderPage,
});

// Locations inside Owerri town where delivery is free. Anywhere else adds a fee.
const OWERRI_TOWNS = [
  "Ikenegbu",
  "New Owerri",
  "Aladinma",
  "Wetheral Road",
  "Douglas Road",
  "Works Layout",
  "World Bank Housing Estate",
  "Egbu Road",
  "Okigwe Road",
  "Amakohia",
  "Orji",
  "Uratta",
  "Naze",
  "Prefab / Umuguma",
  "Akwakuma",
  "Mbaise Road",
  "Control Post",
  "Relief Market Area",
  "Owerri Municipal (other)",
];
const OUTSIDE_TOWN = "Somewhere else (outside Owerri town)";


const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");

function OrderPage() {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [optionIdx, setOptionIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [town, setTown] = useState(OWERRI_TOWNS[0]!);
  const zone: "owerri" | "outside" = town === OUTSIDE_TOWN ? "outside" : "owerri";
  const [mode, setMode] = useState<"now" | "preorder">("now");
  const [preorderDate, setPreorderDate] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [sent, setSent] = useState(false);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [trackCode, setTrackCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentClaimed, setPaymentClaimed] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState<string | null>(null);
  const createOrderFn = useServerFn(createOrder);
  const markPaidFn = useServerFn(markPaymentSubmitted);
  const validateVoucherFn = useServerFn(validateVoucher);

  const product = useMemo(() => PRODUCTS.find((p) => p.id === productId)!, [productId]);
  const option = product.options[Math.min(optionIdx, product.options.length - 1)];
  const subtotal = option.price * Math.max(1, qty);
  const delivery = zone === "owerri" ? 0 : 1000;
  const total = subtotal + delivery - voucherDiscount;
  const belowMinimum = subtotal < MIN_ORDER_SUBTOTAL;
  const minPreorderDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const preorderLabel = mode === "preorder" && preorderDate
    ? `Pre-order for ${new Date(preorderDate + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const voucherMutation = useMutation({
    mutationFn: () => validateVoucherFn({ data: { code: voucherInput, subtotal } }),
    onSuccess: (result) => {
      setVoucherMessage(result.message);
      if (result.valid) {
        setAppliedVoucherCode(result.code);
        setVoucherDiscount(result.discountAmount);
      } else {
        setAppliedVoucherCode("");
        setVoucherDiscount(0);
      }
    },
    onError: (err: Error) => {
      setAppliedVoucherCode("");
      setVoucherDiscount(0);
      setVoucherMessage(err.message);
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (belowMinimum) {
      setErrorMsg(`Minimum order is ${naira(MIN_ORDER_SUBTOTAL)}. Please add a little more before checking out.`);
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await createOrderFn({
        data: {
          customerName: form.name,
          phone: form.phone,
          address: `${form.address}, ${town}`,
          deliveryZone: zone,
          items: [{
            product: mode === "preorder" ? `PRE-ORDER · ${product.name}` : product.name,
            option: preorderLabel ? `${option.label} · ${preorderLabel}` : option.label,
            qty,
            unitPrice: option.price,
          }],
          subtotal,
          deliveryFee: delivery,
          total,
           voucherCode: appliedVoucherCode || null,
          notes: [preorderLabel, form.notes].filter(Boolean).join(" · ") || null,
        },
      });
      setOrderCode(res.orderCode);
      setTrackCode(res.trackCode);
      setSent(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not send order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const claimPayment = async () => {
    if (!trackCode) return;
    setClaimSubmitting(true);
    setClaimError(null);
    try {
      await markPaidFn({ data: { trackCode } });
      setPaymentClaimed(true);
      const msg =
        `Payment made · Dignity Agro Farms%0A%0A` +
        `Order ID: ${orderCode}%0A` +
        `Tracking code: ${trackCode}%0A` +
        `Amount: ${naira(total)}%0A` +
        `Name: ${form.name}%0A` +
        `Phone: ${form.phone}%0A` +
        `Address: ${form.address}%0A%0A` +
        `I have transferred ${naira(total)} to Opay 7083476366 (Ihemegbulem). Please confirm and start my order.`;
      window.open(`https://wa.me/2347083476366?text=${msg}`, "_blank");
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Could not mark as paid.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText("7083476366");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  const copyTrackCode = async () => {
    if (!trackCode) return;
    try {
      await navigator.clipboard.writeText(trackCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* noop */ }
  };

  const adminWaLink = () => {
    const enrichedForm = {
      ...form,
      customerName: form.name,
      deliveryZone: zone,
      items: [{
        product: mode === "preorder" ? `PRE-ORDER · ${product.name}` : product.name,
        option: preorderLabel ? `${option.label} · ${preorderLabel}` : option.label,
        qty,
      }],
    };
    const itemsText = enrichedForm.items.map(item => `- ${item.qty}x ${item.product} (${item.option})`).join("\\n");
    const text = encodeURIComponent(
      `Hello Dignity Agro Farms! I have just placed an order on the website.\\n\\n` +
      `*Order ID:* ${orderCode}\\n` +
      `*Customer:* ${enrichedForm.customerName}\\n` +
      `*Phone:* ${enrichedForm.phone}\\n` +
      `*Delivery Address:* ${enrichedForm.address} (${enrichedForm.deliveryZone})\\n\\n` +
      `*Items Ordered:*\\n${itemsText}\\n\\n` +
      `*Amount Due:* ${naira(total)}\\n\\n` +
      `I am proceeding to make the payment now, and I will send the payment receipt here shortly.`
    );
    return `https://wa.me/2347083476366?text=${text}`;
  };

  const sendToAdminWhatsApp = () => {
    window.open(adminWaLink(), "_blank");
  };

  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Place an Order</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Pick your product. See your price.</h1>
          <p className="mt-4 text-lg text-white/80">Choose a product, select the Kg or pack size, add your delivery details, and your total shows instantly. Minimum order {naira(MIN_ORDER_SUBTOTAL)}.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto text-[#3F8F3F]" size={56} />
              <h3 className="mt-4 text-2xl font-semibold">Order placed!</h3>
              {orderCode && (
                <p className="mt-2 text-sm text-[#0F3D24]/70">
                  Order ID: <span className="font-mono font-semibold text-[#0F3D24]">{orderCode}</span> · Amount due: <span className="font-semibold text-[#0F3D24]">{naira(total)}</span>
                </p>
              )}
              {trackCode && (
                <div className="mx-auto mt-4 max-w-md rounded-2xl bg-[#3F8F3F]/10 p-4 ring-1 ring-[#3F8F3F]/30">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3F8F3F]">Your order / tracking / receipt number</p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-semibold text-[#0F3D24]">{trackCode}</span>
                    <button type="button" onClick={copyTrackCode} className="rounded-full bg-[#0F3D24]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-[#0F3D24]/20">
                      <Copy size={12} className="inline" /> {codeCopied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[#0F3D24]/70">Save this number. It is your tracking code and your receipt number. If you lose it, you can look it up on the Track Your Order page with your phone number.</p>
                </div>
              )}

              {form.phone && (
                <div className="mt-4">
                  <button
                    onClick={sendToAdminWhatsApp}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#128C7E]"
                  >
                    <MessageCircle size={16} /> Send order details to our WhatsApp
                  </button>
                  <p className="mt-2 text-xs font-medium text-[#0F3D24]/80 text-center">Tap the button above to notify us, then <strong className="text-[#0F3D24]">drop your payment receipt in the chat</strong> so we can confirm your order immediately.</p>
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-[#0F3D24] p-6 text-left text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8e6a8]">Send payment to</p>
                <div className="mt-3 grid gap-1 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Bank</span>
                    <span className="font-semibold">Opay</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Account name</span>
                    <span className="font-semibold">Ihemegbulem</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Account number</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-lg font-semibold">7083476366</span>
                      <button type="button" onClick={copyAccount} className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider hover:bg-white/20">
                        <Copy size={12} className="inline" /> {copied ? "Copied" : "Copy"}
                      </button>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/60">Amount</span>
                    <span className="font-display text-xl font-semibold">{naira(total)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-left ring-1 ring-red-200">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={18} />
                <p className="text-xs text-red-800">
                  <span className="font-bold">Security warning:</span> Only send payment to the account above (Opay · 7083476366 · Ihemegbulem). Do not pay any other account you may be sent. Dignity Agro Farms will never ask you to pay a different account. If in doubt, call <a href="tel:+2347083476366" className="font-semibold underline">070 8347 6366</a> before paying.
                </p>
              </div>

              {paymentClaimed ? (
                <div className="mt-6 rounded-2xl bg-[#3F8F3F]/10 p-5 text-left ring-1 ring-[#3F8F3F]/30">
                  <p className="text-sm font-semibold text-[#0F3D24]">Thank you, we have been notified.</p>
                  <p className="mt-1 text-xs text-[#0F3D24]/70">Our team is checking the bank alert. Once approved, you'll be able to track live status. This usually takes a few minutes during business hours.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link to="/track-order" className="rounded-full bg-[#3F8F3F] px-5 py-2.5 text-sm font-semibold text-white">Track this order</Link>
                    <button onClick={() => { setSent(false); setOrderCode(null); setTrackCode(null); setPaymentClaimed(false); }} className="rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white">Place another order</button>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <button
                    onClick={claimPayment}
                    disabled={claimSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1eb856] disabled:opacity-60"
                  >
                    <MessageCircle size={16} /> {claimSubmitting ? "Notifying..." : "I have made payment"}
                  </button>
                  <p className="mt-2 text-xs text-[#0F3D24]/60">Tap after transferring. This notifies us on WhatsApp so we can approve your order.</p>
                  {claimError && <p className="mt-2 text-sm text-red-600">{claimError}</p>}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">When do you need it?</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("now")}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      mode === "now" ? "border-[#3F8F3F] bg-[#3F8F3F]/10" : "border-[#0F3D24]/15 hover:border-[#3F8F3F]"
                    }`}
                  >
                    <Truck size={16} /> Deliver now (quick delivery)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("preorder")}
                    className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      mode === "preorder" ? "border-[#3F8F3F] bg-[#3F8F3F]/10" : "border-[#0F3D24]/15 hover:border-[#3F8F3F]"
                    }`}
                  >
                    <CalendarClock size={16} /> Pre-order for a later date
                  </button>
                </div>
                {mode === "preorder" && (
                  <div className="mt-3 rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/10">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">
                      Delivery date
                      <input
                        required
                        type="date"
                        min={minPreorderDate}
                        value={preorderDate}
                        onChange={(e) => setPreorderDate(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3 py-2 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#3F8F3F]"
                      />
                    </label>
                    <p className="mt-2 text-xs text-[#0F3D24]/70">
                      Reserve ahead for events and festive seasons. Pre-orders are confirmed once payment is approved, and we hold your birds for the date you pick (from 2 days up to 8 weeks ahead).
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">1. Choose a product</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setProductId(p.id); setOptionIdx(0); }}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        productId === p.id
                          ? "border-[#3F8F3F] bg-[#3F8F3F]/10 text-[#0F3D24]"
                          : "border-[#0F3D24]/15 bg-white text-[#0F3D24] hover:border-[#3F8F3F]"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">2. Choose an option (with price)</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.options.map((o, i) => {
                    const active = i === optionIdx;
                    return (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setOptionIdx(i)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          active
                            ? "bg-[#3F8F3F] text-white shadow"
                            : "border border-[#0F3D24]/15 bg-white text-[#0F3D24] hover:border-[#3F8F3F]"
                        }`}
                      >
                        {o.label} · {naira(o.price)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">3. Quantity ({product.unitLabel})</div>
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-full border border-[#0F3D24]/15 text-lg font-bold hover:bg-[#0F3D24] hover:text-white">−</button>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(200, parseInt(e.target.value || "1", 10))))}
                    className="w-20 rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-center text-sm font-semibold outline-none focus:border-[#3F8F3F]"
                  />
                  <button type="button" onClick={() => setQty((q) => Math.min(200, q + 1))} className="grid h-10 w-10 place-items-center rounded-full border border-[#0F3D24]/15 text-lg font-bold hover:bg-[#0F3D24] hover:text-white">+</button>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">4. Select your exact town</div>
                <select
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <optgroup label="Owerri town (free delivery)">
                    {OWERRI_TOWNS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Outside Owerri town">
                    <option value={OUTSIDE_TOWN}>{OUTSIDE_TOWN} (add {naira(1000)})</option>
                  </optgroup>
                </select>
                <p className="mt-2 text-xs text-[#0F3D24]/60">
                  {zone === "owerri"
                    ? "Delivery is free to this location."
                    : `Locations outside Owerri town attract a ${naira(1000)} delivery fee. Add the full address below and we will confirm.`}
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">5. Your details</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#3F8F3F] focus:ring-4 focus:ring-[#3F8F3F]/20" />
                  <input required type="tel" placeholder="Phone (WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#3F8F3F] focus:ring-4 focus:ring-[#3F8F3F]/20" />
                  <input required placeholder="Street address (house number, street)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#3F8F3F] focus:ring-4 focus:ring-[#3F8F3F]/20" />
                  <textarea rows={3} maxLength={500} placeholder="Notes (e.g. dress the bird, delivery time…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none transition-all duration-300 focus:border-[#3F8F3F] focus:ring-4 focus:ring-[#3F8F3F]/20" />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">6. Voucher code (optional)</div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setAppliedVoucherCode("");
                      setVoucherDiscount(0);
                      setVoucherMessage(null);
                    }}
                    placeholder="Enter voucher code"
                    className="min-w-0 flex-1 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm uppercase outline-none transition-all duration-300 focus:border-[#3F8F3F] focus:ring-4 focus:ring-[#3F8F3F]/20"
                  />
                  <button
                    type="button"
                    onClick={() => voucherMutation.mutate()}
                    disabled={!voucherInput.trim() || voucherMutation.isPending}
                    className="rounded-full bg-[#3F8F3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4ea94e] disabled:opacity-50"
                  >
                    {voucherMutation.isPending ? "Checking..." : "Apply voucher"}
                  </button>
                </div>
                {voucherMessage && (
                  <p className={`mt-2 text-xs font-semibold ${voucherDiscount > 0 ? "text-[#3F8F3F]" : "text-red-600"}`}>
                    {voucherMessage}
                  </p>
                )}
              </div>

              {belowMinimum && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
                  Minimum order is {naira(MIN_ORDER_SUBTOTAL)}. Your items currently come to {naira(subtotal)}, so please add a little more.
                </div>
              )}
              {errorMsg && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{errorMsg}</div>
              )}
              <button type="submit" disabled={submitting || belowMinimum} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-6 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#134a2c] hover:shadow-[0_10px_20px_rgba(15,61,36,0.3)] disabled:transform-none disabled:opacity-60 disabled:shadow-none">
                <ShoppingBag size={16} /> {submitting ? "Sending..." : `Place order · ${naira(total)}`}
              </button>
            </form>
          )}
        </div>

        <aside className="h-max rounded-3xl bg-gradient-to-br from-[#0F3D24] to-[#1a5a3a] p-6 text-white shadow-2xl shadow-[#0F3D24]/20 ring-1 ring-white/10 sm:p-8 lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8e6a8]">Order summary</p>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Product" value={product.name} />
            <Row label="Type" value={preorderLabel ?? (mode === "preorder" ? "Pre-order (pick a date)" : "Deliver now")} />
            <Row label="Option" value={option.label} />
            <Row label="Quantity" value={`${qty} ${product.unitLabel}`} />
            <Row label="Subtotal" value={naira(subtotal)} />
             {voucherDiscount > 0 && <Row label={`Discount${appliedVoucherCode ? ` (${appliedVoucherCode})` : ""}`} value={`-${naira(voucherDiscount)}`} />}
            <Row label="Town" value={town} />
            <Row label="Delivery" value={zone === "owerri" ? "FREE (Owerri town)" : `${naira(1000)} (outside Owerri town)`} />
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-white/15 pt-5">
            <span className="text-sm uppercase tracking-wider text-[#a8e6a8]">Total</span>
            <span className="font-display text-3xl font-semibold">{naira(total)}</span>
          </div>
          <div className="mt-6 rounded-2xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
            <p className="font-semibold text-[#a8e6a8]">Prefer to call?</p>
            <a href="tel:+2347083476366" className="mt-1 inline-flex items-center gap-2 text-white hover:text-[#a8e6a8]"><PhoneCall size={14} /> 070 8347 6366</a>
            <p className="mt-3 text-white/70">Quick delivery within Owerri town. Live birds are weighed in your presence at pickup. Minimum order {naira(MIN_ORDER_SUBTOTAL)}.</p>
          </div>
          <Link to="/products" className="mt-4 block text-center text-xs font-semibold uppercase tracking-wider text-[#a8e6a8] hover:text-white">See full price list →</Link>
        </aside>
      </section>

      {/* SEO WRITE-UPS */}
      <section className="bg-[#0F3D24]/5 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <h3 className="text-xl font-semibold text-[#0F3D24]">Wholesale vs Retail Ordering</h3>
              <p className="mt-3 text-sm text-[#0F3D24]/75 leading-relaxed">
                Whether you're picking up a single tray of eggs for your household or ordering 50 crates for a restaurant, Dignity Agro Farms scales to your needs. Our checkout seamlessly handles retail quantities, but for bulk and wholesale purchases, our direct lines are always open. We prioritize large-scale distributors with consistent stock and preferential bulk rates.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0F3D24]">Transparent Pricing & Fulfillment</h3>
              <p className="mt-3 text-sm text-[#0F3D24]/75 leading-relaxed">
                When you check out on our platform, the price you see is the price you pay. There are no hidden fees. We price our live broilers transparently by the kilogram, and delivery fees within and outside Owerri are flat and predictable. Once your order is placed, our fulfillment team immediately begins picking, weighing, and dispatching your items for peak freshness.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#0F3D24]">Secure Bank Transfers</h3>
              <p className="mt-3 text-sm text-[#0F3D24]/75 leading-relaxed">
                To keep our checkout fast and friction-free, we accept direct bank transfers to our dedicated Opay account. This ensures your payment is processed instantly and securely without relying on third-party card gateways. Simply make the transfer, click the WhatsApp confirmation button, and attach your receipt. We instantly verify against bank alerts for rapid dispatch.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-white/60">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}