import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site/Layout";
import { createPreorder, submitPreorderPayment, getPreorderByCode } from "@/lib/preorders.functions";
import type { Preorder, PreorderPayment, ReservationType } from "@/lib/preorders.functions";
import { trackUnified } from "@/lib/orders.functions";
import { CheckCircle2, Download, Clock, AlertTriangle, ChevronDown, ChevronUp, Phone, Loader2 } from "lucide-react";



const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

const SLOT_FEE = 3500;

const DECEMBER_PRODUCTS = [
  { label: "Live Broiler Chicken (3kg and above)", price: 12250 },
];

const RESERVATION_OPTIONS: { type: ReservationType; title: string; amount: string; badge: string; badgeColor: string; desc: string; warning?: string }[] = [
  {
    type: "slot_reserved",
    title: "Reserve with ₦3,500",
    amount: "₦3,500 deposit",
    badge: "SLOT RESERVED",
    badgeColor: "bg-amber-100 text-amber-800",
    desc: "Pay ₦3,500 to secure your December slot. This becomes part of your total order payment and reduces your remaining balance.",
  },
  {
    type: "free_reservation",
    title: "Reserve for Free",
    amount: "No payment now",
    badge: "FREE RESERVATION",
    badgeColor: "bg-sky-100 text-sky-800",
    desc: "Reserve without payment. You will need to complete payment before delivery.",
    warning: "Free reservations are NOT guaranteed until payment is made.",
  },
  {
    type: "outright",
    title: "Pay Outrightly",
    amount: "Full payment",
    badge: "FULLY PAID",
    badgeColor: "bg-emerald-100 text-emerald-800",
    desc: "Pay the full amount of your order immediately. Your slot will be fully secured and marked as Paid.",
  },
];

type Step = "form" | "success" | "payment_submitted" | "lookup";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-slate-100 text-slate-700",
    partially_paid: "bg-amber-100 text-amber-800",
    fully_paid: "bg-emerald-100 text-emerald-800",
    delivered: "bg-teal-100 text-teal-800",
    slot_reserved: "bg-amber-100 text-amber-800",
    free_reservation: "bg-sky-100 text-sky-800",
    outright: "bg-emerald-100 text-emerald-800",
  };
  const labels: Record<string, string> = {
    pending: "Payment Pending",
    partially_paid: "Partially Paid",
    fully_paid: "Fully Paid",
    delivered: "Delivered",
    slot_reserved: "Slot Reserved",
    free_reservation: "Free Reservation",
    outright: "Outright Payment",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      {labels[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

function InvoicePrint({ preorder }: { preorder: Preorder }) {
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Invoice ${preorder.preorderCode}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;font-size:14px}
.logo{font-size:22px;font-weight:700;color:#0F3D24}
.logo small{display:block;font-size:11px;font-weight:400;color:#555;letter-spacing:.1em;text-transform:uppercase}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F3D24;padding-bottom:16px;margin-bottom:24px}
.invoice-title{font-size:28px;font-weight:700;color:#0F3D24;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#0F3D24;color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase}
td{padding:10px 12px;border-bottom:1px solid #eee}
.totals td{font-weight:600}
.balance{background:#fff7ed;font-size:15px}
.balance td{color:#9a3412;font-weight:700}
.fully-paid{background:#f0fdf4}
.fully-paid td{color:#15803d;font-weight:700}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#666;text-align:center}
.field{margin-bottom:6px}
.label{color:#555;font-size:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div class="logo">Dignity Agro Farms<small>Limited</small></div>
  <div style="text-align:right">
    <div class="invoice-title">INVOICE</div>
    <div class="label" style="margin-top:4px"># ${preorder.preorderCode}</div>
    <div class="label">Date: ${new Date(preorder.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
</div>
<div class="grid">
  <div>
    <div class="label">Bill To</div>
    <div class="field"><strong>${preorder.customerName}</strong></div>
    <div class="field">${preorder.phone}</div>
    ${preorder.email ? `<div class="field">${preorder.email}</div>` : ""}
    <div class="field">${preorder.address}</div>
  </div>
  <div>
    <div class="label">Reservation Type</div>
    <div class="field"><strong>${preorder.reservationType === "slot_reserved" ? "₦3,500 Slot Reservation" : preorder.reservationType === "free_reservation" ? "Free Reservation" : "Outright Payment"}</strong></div>
    ${preorder.preferredDeliveryDate ? `<div class="label" style="margin-top:8px">Preferred Delivery</div><div class="field">${preorder.preferredDeliveryDate}</div>` : ""}
  </div>
</div>
<table>
  <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>
    <tr><td>${preorder.product}</td><td>${preorder.quantity}</td><td>₦${preorder.unitPrice.toLocaleString()}</td><td>₦${preorder.totalAmount.toLocaleString()}</td></tr>
  </tbody>
</table>
<table class="totals">
  <tr><td>Total Order Amount</td><td style="text-align:right">₦${preorder.totalAmount.toLocaleString()}</td></tr>
  <tr><td>Amount Paid</td><td style="text-align:right">₦${preorder.amountPaid.toLocaleString()}</td></tr>
  <tr class="${preorder.balance === 0 ? "fully-paid" : "balance"}"><td>Outstanding Balance</td><td style="text-align:right">₦${preorder.balance.toLocaleString()}</td></tr>
</table>
<div style="margin-top:24px;padding:12px 16px;background:#f0fdf4;border-radius:8px;font-size:12px">
  <strong>Payment Account:</strong> Moniepoint MFB · 4006179439 · Dignity Agro Farms Limited
</div>
${preorder.reservationType === "free_reservation" ? '<div style="margin-top:12px;padding:12px 16px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e"><strong>Important:</strong> Free reservations are not guaranteed until payment is made.</div>' : ""}
<div class="footer">Thank you for choosing Dignity Agro Farms.<br>Fresh from our farm to your table. · dignityagrofarms.com · 08167099492</div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };
  return (
    <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c] transition">
      <Download size={15} /> Download Invoice
    </button>
  );
}

function ReceiptPrint({ preorder, payments }: { preorder: Preorder; payments: PreorderPayment[] }) {
  const confirmed = payments.filter((p) => p.confirmedByAdmin);
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    let paymentRows = confirmed.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(p.paymentDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td>${p.paymentReference}</td>
        <td style="text-align:right">₦${p.amount.toLocaleString()}</td>
      </tr>`).join("");
    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Receipt ${preorder.preorderCode}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;font-size:14px}
.logo{font-size:22px;font-weight:700;color:#0F3D24}
.logo small{display:block;font-size:11px;font-weight:400;color:#555;letter-spacing:.1em;text-transform:uppercase}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #3F8F3F;padding-bottom:16px;margin-bottom:24px}
.receipt-title{font-size:28px;font-weight:700;color:#3F8F3F;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#0F3D24;color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase}
td{padding:10px 12px;border-bottom:1px solid #eee}
.summary td{font-weight:600}
.balance{background:#fff7ed}
.balance td{color:#9a3412;font-weight:700}
.fully-paid{background:#f0fdf4}
.fully-paid td{color:#15803d;font-weight:700}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#666;text-align:center}
.label{color:#555;font-size:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.field{margin-bottom:6px}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div class="logo">Dignity Agro Farms<small>Limited</small></div>
  <div style="text-align:right">
    <div class="receipt-title">RECEIPT</div>
    <div class="label" style="margin-top:4px"># ${preorder.preorderCode}</div>
    <div class="label">Date: ${new Date().toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
</div>
<div class="grid">
  <div>
    <div class="label">Customer</div>
    <div class="field"><strong>${preorder.customerName}</strong></div>
    <div class="field">${preorder.phone}</div>
    ${preorder.email ? `<div class="field">${preorder.email}</div>` : ""}
  </div>
  <div>
    <div class="label">Order</div>
    <div class="field"><strong>${preorder.product}</strong></div>
    <div class="field">Qty: ${preorder.quantity}</div>
  </div>
</div>
<div class="label" style="margin-bottom:8px">Payment History</div>
<table>
  <thead><tr><th>#</th><th>Date</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${paymentRows || "<tr><td colspan='4' style='text-align:center;color:#999'>No confirmed payments yet</td></tr>"}</tbody>
</table>
<table class="summary">
  <tr><td>Total Order Amount</td><td style="text-align:right">₦${preorder.totalAmount.toLocaleString()}</td></tr>
  <tr><td>Total Amount Paid</td><td style="text-align:right">₦${preorder.amountPaid.toLocaleString()}</td></tr>
  <tr class="${preorder.balance === 0 ? "fully-paid" : "balance"}">
    <td>${preorder.balance === 0 ? "✓ FULLY PAID — Balance" : "Outstanding Balance"}</td>
    <td style="text-align:right">₦${preorder.balance.toLocaleString()}</td>
  </tr>
</table>
<div class="footer">Thank you for choosing Dignity Agro Farms.<br>Fresh from our farm to your table. · dignityagrofarms.com · 08167099492</div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };
  return (
    <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-full border border-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/5 transition">
      <Download size={15} /> Download Receipt
    </button>
  );
}

export function DecemberPreorderForm({ onStateChange }: { onStateChange?: (state: any) => void }) {
  const navigate = useNavigate();
  const createFn = useServerFn(createPreorder);
  const submitPaymentFn = useServerFn(submitPreorderPayment);
  const getByCodeFn = useServerFn(getPreorderByCode);
  const trackUnifiedFn = useServerFn(trackUnified);

  const [step, setStep] = useState<Step>("form");
  const [reservationType, setReservationType] = useState<ReservationType>("slot_reserved");
  const [form, setForm] = useState({ name: "", phone: "", email: "", zone: "", address: "", product: "", qty: "1", notes: "", deliveryDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  // Payment submission state
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  // Lookup state
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<{ preorder: Preorder; payments: PreorderPayment[] } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const selectedProduct = DECEMBER_PRODUCTS.find((p) => p.label === form.product);
  const qty = Math.max(1, parseInt(form.qty) || 1);
  const unitPrice = selectedProduct?.price ?? 0;
  const totalAmount = unitPrice * qty;
  const depositAmount = reservationType === "slot_reserved" ? (SLOT_FEE * qty) : reservationType === "outright" ? totalAmount : 0;

  useEffect(() => {
    onStateChange?.({
      product: form.product,
      qty,
      zone: form.zone,
      totalAmount,
      depositAmount,
      reservationType,
    });
  }, [form.product, qty, form.zone, totalAmount, depositAmount, reservationType, onStateChange]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.product) { setError("Please select a product."); return; }
    if (totalAmount < 1000 && reservationType !== "free_reservation") { setError("Please select a valid product and quantity."); return; }
    setSubmitting(true);
    try {
      const { preorderCode } = await createFn({
        data: {
          customerName: form.name,
          phone: form.phone,
          email: form.email || "",
          address: `${form.zone} - ${form.address}`,
          product: form.product,
          quantity: qty,
          unitPrice,
          totalAmount,
          reservationType,
          preferredDeliveryDate: form.deliveryDate || null,
          notes: form.notes || null,
        },
      });
      setCreatedCode(preorderCode);
      setStep("success");
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (msg.startsWith("[")) {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
            msg = parsed.map((e: any) => e.message).join(", ");
          }
        } catch { /* ignore parse error */ }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdCode) return;
    setPaymentError(null);
    setPaymentSubmitting(true);
    try {
      await submitPaymentFn({ data: { preorderCode: createdCode, amount: depositAmount, paymentReference: paymentRef.trim() || undefined } });
      setPaymentDone(true);
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Could not submit payment. Please try again.";
      if (msg.startsWith("[")) {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
            msg = parsed.map((e: any) => e.message).join(", ");
          }
        } catch { /* ignore parse error */ }
      }
      setPaymentError(msg);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const code = lookupCode.trim().toUpperCase();
      // First try preorders
      const result = await getByCodeFn({ data: { preorderCode: code } });
      if (result) {
        setLookupResult(result);
      } else {
        // Fall back: check if it's a regular order (DAF- code)
        const unified = await trackUnifiedFn({ data: { trackCode: code } });
        if (unified.result?.type === "order") {
          // Redirect to track-order page with the code pre-filled
          navigate({ to: "/track-order", search: {} });
          // Small delay to let navigation settle, then we can't pre-fill directly
          // so show helpful message instead
          setLookupError(`"${code}" is a regular order (not a December pre-order). Please use the main Track Order page to view it.`);
        } else {
          setLookupError("No order found with that code. Please check and try again.");
        }
      }
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Lookup failed.";
      if (msg.startsWith("[")) {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
            msg = parsed.map((e: any) => e.message).join(", ");
          }
        } catch { /* ignore parse error */ }
      }
      setLookupError(msg);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0F3D24] via-[#134a2c] to-[#1a5c38] p-8 text-white text-center shadow-lg mb-8">
        <span className="inline-block rounded-full bg-[#3F8F3F]/30 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#a8e6a8]">Limited Slots Available</span>
        <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">December Pre-Order Sales</h1>
        <p className="mt-4 text-sm text-white/80 max-w-2xl mx-auto">Secure your December order early and enjoy a smooth and convenient ordering experience with Dignity Agro Farms.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={() => setStep("form")} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${step === "form" || step === "success" || step === "payment_submitted" ? "bg-white text-[#0F3D24]" : "bg-white/15 text-white hover:bg-white/25"}`}>
            Place Pre-Order
          </button>
          <button onClick={() => { setStep("lookup"); setLookupResult(null); setLookupError(null); }} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${step === "lookup" ? "bg-white text-[#0F3D24]" : "bg-white/15 text-white hover:bg-white/25"}`}>
            Track My Order
          </button>
        </div>
      </div>

      <div className="mx-auto w-full">

        {/* ── FORM ── */}
        {step === "form" && (
          <div>
            {/* Option Selection */}
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-[#0F3D24]">Choose your reservation option</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {RESERVATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setReservationType(opt.type)}
                    className={`rounded-2xl border-2 p-4 text-left transition ${reservationType === opt.type ? "border-[#3F8F3F] bg-[#3F8F3F]/5" : "border-[#0F3D24]/10 hover:border-[#3F8F3F]/40"}`}
                  >
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${opt.badgeColor}`}>{opt.badge}</span>
                    <p className="mt-2 text-sm font-semibold text-[#0F3D24]">{opt.title}</p>
                    <p className="mt-1 text-xs text-[#0F3D24]/60">{opt.amount}</p>
                    {opt.warning && <p className="mt-2 text-[11px] text-amber-700 font-medium">{opt.warning}</p>}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-sm text-[#0F3D24]/70">{RESERVATION_OPTIONS.find((o) => o.type === reservationType)?.desc}</p>
            </div>

            <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/8 sm:p-8">
              <h2 className="mb-6 text-xl font-semibold text-[#0F3D24]">Your details</h2>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Full name *</label>
                    <input required value={form.name} onChange={set("name")} placeholder="Enter your full name" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Phone number *</label>
                    <input required type="tel" value={form.phone} onChange={set("phone")} placeholder="e.g. 0708 347 6366" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Email address</label>
                  <input type="email" value={form.email} onChange={set("email")} placeholder="Optional — for invoice by email" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Delivery Zone (Owerri) *</label>
                    <select required value={form.zone} onChange={set("zone")} className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] bg-white">
                      <option value="">Select an area</option>
                      <option value="Ikenegbu">Ikenegbu</option>
                      <option value="Aladinma">Aladinma</option>
                      <option value="Wetheral">Wetheral</option>
                      <option value="Amakohia">Amakohia</option>
                      <option value="Akwakuma">Akwakuma</option>
                      <option value="Orji">Orji</option>
                      <option value="Irete">Irete</option>
                      <option value="World Bank">World Bank</option>
                      <option value="New Owerri">New Owerri</option>
                      <option value="Egbu">Egbu</option>
                      <option value="Naze">Naze</option>
                      <option value="Nekede">Nekede</option>
                      <option value="Control Post / Assumpta">Control Post / Assumpta</option>
                      <option value="Other Owerri Area">Other Owerri Area</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Full Delivery Address *</label>
                    <input required value={form.address} onChange={set("address")} placeholder="Street name and house number" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Product *</label>
                  <select required value={form.product} onChange={set("product")} className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] bg-white">
                    <option value="">Select a product</option>
                    {DECEMBER_PRODUCTS.map((p) => (
                      <option key={p.label} value={p.label}>{p.label} — {naira(p.price)} each</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Quantity *</label>
                    <input required type="number" min="1" max="500" value={form.qty} onChange={set("qty")} className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Preferred delivery date (Dec only)</label>
                    <input type="date" min="2026-12-01" max="2026-12-31" value={form.deliveryDate} onChange={set("deliveryDate")} className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] bg-white" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Additional notes</label>
                  <textarea value={form.notes} onChange={set("notes")} rows={2} placeholder="Any special instructions or requests" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] resize-none" />
                </div>
              </div>

              {/* Order Summary */}
              {selectedProduct && (
                <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-4 text-sm ring-1 ring-[#0F3D24]/8">
                  <p className="mb-3 font-semibold text-[#0F3D24]">Order summary</p>
                  <div className="space-y-1.5 text-[#0F3D24]/80">
                    <div className="flex justify-between"><span>{form.product}</span><span>{naira(unitPrice)} × {qty}</span></div>
                    <div className="flex justify-between font-semibold text-[#0F3D24] border-t border-[#0F3D24]/10 pt-2"><span>Total Order Amount</span><span>{naira(totalAmount)}</span></div>
                    {reservationType === "slot_reserved" && (
                      <>
                        <div className="flex justify-between text-amber-700"><span>Deposit to pay now</span><span>{naira(SLOT_FEE)}</span></div>
                        <div className="flex justify-between text-[#0F3D24]/60"><span>Remaining balance after deposit</span><span>{naira(totalAmount - SLOT_FEE)}</span></div>
                      </>
                    )}
                    {reservationType === "outright" && (
                      <div className="flex justify-between text-emerald-700 font-semibold"><span>Amount to pay now</span><span>{naira(totalAmount)}</span></div>
                    )}
                    {reservationType === "free_reservation" && (
                      <div className="flex justify-between text-sky-700"><span>Amount to pay now</span><span>₦0 (pay later)</span></div>
                    )}
                  </div>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-[#0F3D24] px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-60 transition flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : reservationType === "free_reservation" ? "Reserve My Slot (Free)" : "Continue to Payment"}
              </button>
            </form>
          </div>
        )}

        {/* ── SUCCESS + PAYMENT INSTRUCTIONS ── */}
        {step === "success" && createdCode && (
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/8 sm:p-8">
            <div className="mb-6 flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={32} />
              <div>
                <h2 className="text-xl font-semibold text-[#0F3D24]">
                  {reservationType === "free_reservation" ? "Reservation Received!" : "Pre-Order Created!"}
                </h2>
                <p className="mt-1 text-sm text-[#0F3D24]/70">Your pre-order reference code is:</p>
                <p className="mt-1 text-2xl font-bold tracking-wide text-[#3F8F3F]">{createdCode}</p>
                <p className="mt-1 text-xs text-[#0F3D24]/55">Save this code — you will need it to track your order and make future payments.</p>
              </div>
            </div>

            {reservationType === "free_reservation" && (
              <div className="mb-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 text-sm text-amber-800">
                <AlertTriangle size={16} className="inline mr-1.5" />
                <strong>Important:</strong> Your slot has been received but is <strong>NOT guaranteed</strong> until payment is made. Please complete payment as soon as possible to secure your December order.
              </div>
            )}

            {(reservationType === "slot_reserved" || reservationType === "outright") && !paymentDone && (
              <div className="mb-6">
                <div className="mb-4 rounded-2xl bg-[#0F3D24] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a8e6a8] mb-2">Send Payment To</p>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-white/60">Bank</span><span className="font-semibold text-right">Moniepoint MFB</span>
                    <span className="text-white/60">Account Name</span><span className="font-semibold text-right">Dignity Agro Farms Limited</span>
                    <span className="text-white/60">Account Number</span><span className="font-mono font-bold text-lg text-right">4006179439</span>
                    <span className="text-white/60">Amount</span><span className="font-bold text-right text-[#a8e6a8]">{naira(depositAmount)}</span>
                  </div>
                </div>
                <form onSubmit={handlePaymentSubmit}>
                  <label className="mb-1.5 block text-sm font-medium text-[#0F3D24]">Payment reference / transaction ID (optional but helpful)</label>
                  <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="e.g. from your bank alert" className="w-full rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]" />
                  {paymentError && <p className="mt-2 text-sm text-red-600">{paymentError}</p>}
                  <button type="submit" disabled={paymentSubmitting} className="mt-4 w-full rounded-full bg-[#3F8F3F] px-5 py-3 text-sm font-semibold text-white hover:bg-[#4ea94e] disabled:opacity-60 transition flex items-center justify-center gap-2">
                    {paymentSubmitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "I Have Made Payment"}
                  </button>
                </form>
              </div>
            )}

            {paymentDone && (
              <div className="mb-6 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 text-sm text-emerald-800">
                <CheckCircle2 size={16} className="inline mr-1.5" />
                <strong>Payment submitted!</strong> Our team will verify your payment and confirm it shortly. You can track your order status below.
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link to="/december-preorder" onClick={() => { setStep("lookup"); setLookupCode(createdCode); }} className="inline-flex items-center gap-2 rounded-full border border-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/5 transition">
                Track My Order
              </Link>
              <button onClick={() => { setStep("form"); setCreatedCode(null); setPaymentDone(false); setPaymentRef(""); }} className="rounded-full bg-[#0F3D24]/8 px-5 py-2.5 text-sm font-semibold text-[#0F3D24] hover:bg-[#0F3D24]/15 transition">
                Place Another Order
              </button>
            </div>
          </div>
        )}

        {/* ── TRACK / CUSTOMER DASHBOARD ── */}
        {step === "lookup" && (
          <div>
            <h2 className="mb-6 text-xl font-semibold text-[#0F3D24]">Track My Pre-Order</h2>
            <form onSubmit={handleLookup} className="flex gap-3 mb-8">
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Enter your pre-order code (e.g. DEC-12345)"
                className="flex-1 min-w-0 rounded-xl border border-[#0F3D24]/15 px-4 py-3 text-sm outline-none focus:border-[#3F8F3F]"
              />
              <button type="submit" disabled={lookupLoading} className="rounded-full bg-[#0F3D24] px-5 py-3 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-60 transition">
                {lookupLoading ? <Loader2 size={16} className="animate-spin" /> : "Track"}
              </button>
            </form>

            {lookupError && <p className="text-sm text-red-600 mb-4">{lookupError}</p>}

            {lookupResult && (() => {
              const { preorder, payments } = lookupResult;
              const confirmed = payments.filter((p) => p.confirmedByAdmin);
              const pending = payments.filter((p) => !p.confirmedByAdmin);
              return (
                <div className="space-y-4">
                  {/* Order Card */}
                  <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/8 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#0F3D24]/50">Pre-Order</p>
                        <p className="text-2xl font-bold text-[#0F3D24]">{preorder.preorderCode}</p>
                        <p className="mt-0.5 text-sm text-[#0F3D24]/60">{new Date(preorder.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={preorder.reservationType} />
                        <StatusBadge status={preorder.paymentStatus} />
                        {preorder.deliveryStatus === "delivered" && <StatusBadge status="delivered" />}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 text-sm text-[#0F3D24]/80 mb-5">
                      <div><span className="font-medium text-[#0F3D24]">Product:</span> {preorder.product}</div>
                      <div><span className="font-medium text-[#0F3D24]">Quantity:</span> {preorder.quantity}</div>
                      <div><span className="font-medium text-[#0F3D24]">Customer:</span> {preorder.customerName}</div>
                      <div><span className="font-medium text-[#0F3D24]">Phone:</span> {preorder.phone}</div>
                      <div><span className="font-medium text-[#0F3D24]">Delivery Address:</span> {preorder.address}</div>
                      {preorder.preferredDeliveryDate && <div><span className="font-medium text-[#0F3D24]">Preferred Delivery:</span> {preorder.preferredDeliveryDate}</div>}
                    </div>

                    {/* Balance Box */}
                    <div className="rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/8">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-1">Total Order</p>
                          <p className="text-lg font-bold text-[#0F3D24]">{naira(preorder.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-1">Amount Paid</p>
                          <p className="text-lg font-bold text-emerald-600">{naira(preorder.amountPaid)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F3D24]/50 mb-1">Balance</p>
                          <p className={`text-lg font-bold ${preorder.balance === 0 ? "text-emerald-600" : "text-amber-600"}`}>{naira(preorder.balance)}</p>
                        </div>
                      </div>
                      {preorder.balance === 0 && (
                        <p className="mt-3 text-center text-xs font-bold text-emerald-600">✓ FULLY PAID</p>
                      )}
                    </div>

                    {/* Complete Payment CTA */}
                    {preorder.balance > 0 && preorder.reservationType !== "free_reservation" && (
                      <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
                        <p className="text-sm font-semibold text-amber-800 mb-3">Complete your payment</p>
                        <div className="text-sm text-amber-700 space-y-1">
                          <div>Send {naira(preorder.balance)} to <strong>4006179439</strong> (Moniepoint MFB · Dignity Agro Farms Limited)</div>
                        </div>
                        <p className="mt-2 text-xs text-amber-600">After paying, click below to notify us:</p>
                        <CompletePaymentForm preorderCode={preorder.preorderCode} balanceDue={preorder.balance} submitFn={submitPaymentFn} onSuccess={() => handleLookup({ preventDefault: () => {} } as React.FormEvent)} />
                      </div>
                    )}

                    {preorder.reservationType === "free_reservation" && preorder.balance > 0 && (
                      <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200 text-sm text-amber-800">
                        <AlertTriangle size={14} className="inline mr-1" />
                        Your free reservation is <strong>not guaranteed</strong> until payment is made. Please send {naira(preorder.totalAmount)} to <strong>4006179439</strong> (Moniepoint MFB · Dignity Agro Farms) then contact us on <a href="tel:+2348167099492" className="underline font-semibold">08167099492</a>.
                      </div>
                    )}

                    {/* Pending unconfirmed payments */}
                    {pending.length > 0 && (
                      <div className="mt-4 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200 text-sm text-sky-800">
                        <Clock size={14} className="inline mr-1" />
                        You have {pending.length} payment{pending.length > 1 ? "s" : ""} awaiting admin confirmation. Usually confirmed within a few hours.
                      </div>
                    )}

                    {/* Download buttons */}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <InvoicePrint preorder={preorder} />
                      {confirmed.length > 0 && <ReceiptPrint preorder={preorder} payments={payments} />}
                    </div>
                  </div>

                  {/* Payment History */}
                  {payments.length > 0 && (
                    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/8">
                      <button onClick={() => setShowPaymentHistory((v) => !v)} className="flex w-full items-center justify-between font-semibold text-[#0F3D24]">
                        Payment History ({confirmed.length} confirmed)
                        {showPaymentHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {showPaymentHistory && (
                        <div className="mt-4 overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#0F3D24]/10">
                                <th className="pb-2 text-left text-xs font-semibold uppercase text-[#0F3D24]/50">Date</th>
                                <th className="pb-2 text-left text-xs font-semibold uppercase text-[#0F3D24]/50">Reference</th>
                                <th className="pb-2 text-right text-xs font-semibold uppercase text-[#0F3D24]/50">Amount</th>
                                <th className="pb-2 text-center text-xs font-semibold uppercase text-[#0F3D24]/50">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {payments.map((p) => (
                                <tr key={p.id} className="border-b border-[#0F3D24]/5">
                                  <td className="py-2.5">{new Date(p.paymentDate).toLocaleDateString("en-NG")}</td>
                                  <td className="py-2.5 font-mono text-xs">{p.paymentReference}</td>
                                  <td className="py-2.5 text-right font-semibold">{naira(p.amount)}</td>
                                  <td className="py-2.5 text-center">
                                    {p.confirmedByAdmin
                                      ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">CONFIRMED</span>
                                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">PENDING</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Contact CTA */}
      <section className="bg-[#F7F5F0] py-10">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-sm text-[#0F3D24]/70">Need help with your order? Call or WhatsApp us directly.</p>
          <a href="tel:+2348167099492" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-3 text-sm font-semibold text-white hover:bg-[#134a2c] transition">
            <Phone size={15} /> 08167099492
          </a>
        </div>
      </section>
    </div>
  );
}

function CompletePaymentForm({ preorderCode, balanceDue, submitFn, onSuccess }: {
  preorderCode: string;
  balanceDue: number;
  submitFn: ReturnType<typeof useServerFn<typeof submitPreorderPayment>>;
  onSuccess: () => void;
}) {
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await submitFn({ data: { preorderCode, amount: balanceDue, paymentReference: ref.trim() || undefined } });
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error submitting payment.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return <p className="mt-2 text-sm text-emerald-700 font-semibold">✓ Payment submitted! Awaiting confirmation.</p>;

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Transaction ref (optional)" className="flex-1 min-w-0 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500" />
      <button type="submit" disabled={loading} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 transition">
        {loading ? <Loader2 size={14} className="animate-spin" /> : `Notify Us`}
      </button>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </form>
  );
}
