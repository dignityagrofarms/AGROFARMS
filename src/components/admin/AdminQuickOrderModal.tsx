import React, { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  Loader2,
  X,
  Copy,
  CalendarClock,
  Truck,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { createOrder, MIN_ORDER_SUBTOTAL, type AdminRole } from "@/lib/orders.functions";
import { PRODUCTS } from "@/lib/products";

const OWERRI_TOWNS = [
  "Farm Pickup (Owerri)",
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

interface OrderLineDraft {
  productId: string;
  optionIdx: number;
  qty: number;
}

interface AdminQuickOrderModalProps {
  open: boolean;
  onClose: () => void;
  role: AdminRole;
  username: string;
  onOrderCreated?: () => void;
}

export function AdminQuickOrderModal({
  open,
  onClose,
  role,
  username,
  onOrderCreated,
}: AdminQuickOrderModalProps) {
  const createOrderFn = useServerFn(createOrder);

  const [mode, setMode] = useState<"now" | "preorder">("now");
  const [preorderDate, setPreorderDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [town, setTown] = useState(OWERRI_TOWNS[0]!);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderLineDraft[]>([
    {
      productId: PRODUCTS[0]!.id,
      optionIdx: Math.max(
        0,
        PRODUCTS[0]!.options.findIndex((o) => !o.soldOut),
      ),
      qty: 1,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const zone: "owerri" | "outside" = town === OUTSIDE_TOWN ? "outside" : "owerri";
  const deliveryFee = zone === "owerri" ? 0 : 1000;

  const computedItems = useMemo(() => {
    return lines.map((line) => {
      const product = PRODUCTS.find((p) => p.id === line.productId) || PRODUCTS[0]!;
      const option = product.options[Math.min(line.optionIdx, product.options.length - 1)] || product.options[0]!;
      const qty = Math.max(1, line.qty);
      return {
        product,
        option,
        qty,
        lineTotal: option.price * qty,
      };
    });
  }, [lines]);

  const subtotal = useMemo(
    () => computedItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [computedItems],
  );
  const total = subtotal + deliveryFee;
  const totalQty = useMemo(
    () => computedItems.reduce((sum, item) => sum + item.qty, 0),
    [computedItems],
  );

  if (!open) return null;

  const addLine = () => {
    const defaultProd = PRODUCTS[0]!;
    const firstAvailableIdx = Math.max(
      0,
      defaultProd.options.findIndex((o) => !o.soldOut),
    );
    setLines((prev) => [
      ...prev,
      { productId: defaultProd.id, optionIdx: firstAvailableIdx, qty: 1 },
    ]);
  };

  const updateLine = (index: number, patch: Partial<OrderLineDraft>) => {
    setLines((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, ...patch };
        if (patch.productId && patch.productId !== item.productId) {
          const prod = PRODUCTS.find((p) => p.id === patch.productId) || PRODUCTS[0]!;
          next.optionIdx = Math.max(
            0,
            prod.options.findIndex((o) => !o.soldOut),
          );
        }
        return next;
      }),
    );
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setCustomerName("");
    setPhone("");
    setTown(OWERRI_TOWNS[0]!);
    setAddress("");
    setNotes("");
    setMode("now");
    setPreorderDate("");
    setLines([
      {
        productId: PRODUCTS[0]!.id,
        optionIdx: Math.max(
          0,
          PRODUCTS[0]!.options.findIndex((o) => !o.soldOut),
        ),
        qty: 1,
      },
    ]);
    setErrorMsg(null);
    setCreatedCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Please enter the customer's name.");
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMsg("Please enter a valid customer phone number.");
      return;
    }
    if (mode === "preorder" && !preorderDate) {
      setErrorMsg("Please select a preferred delivery/pickup date for this pre-order.");
      return;
    }
    if (subtotal < MIN_ORDER_SUBTOTAL) {
      setErrorMsg(
        role === "owner"
          ? `Minimum order is ${naira(MIN_ORDER_SUBTOTAL)}. Please increase item quantity.`
          : "Order quantity is below the minimum order threshold. Please add more items.",
      );
      return;
    }

    const preorderLabel =
      mode === "preorder" && preorderDate
        ? `Pre-order for ${new Date(preorderDate + "T00:00:00").toLocaleDateString("en-NG", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`
        : null;

    const fullAddress =
      town === "Farm Pickup (Owerri)"
        ? address.trim()
          ? `${address.trim()} (Farm Pickup - Owerri)`
          : "Farm Pickup (Owerri)"
        : `${address.trim() || town}, ${town}`;

    const staffTag = `[Placed by ${role.toUpperCase()}: @${username || role}]`;
    const combinedNotes = [preorderLabel, notes.trim(), staffTag].filter(Boolean).join(" · ");

    setSubmitting(true);
    try {
      const res = await createOrderFn({
        data: {
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: fullAddress,
          deliveryZone: zone,
          items: computedItems.map((ci) => ({
            product: mode === "preorder" ? `PRE-ORDER · ${ci.product.name}` : ci.product.name,
            option: preorderLabel ? `${ci.option.label} · ${preorderLabel}` : ci.option.label,
            qty: ci.qty,
            unitPrice: ci.option.price,
          })),
          subtotal,
          deliveryFee,
          total,
          notes: combinedNotes,
          voucherCode: null,
        },
      });
      setCreatedCode(res.orderCode);
      onOrderCreated?.();
    } catch (err: any) {
      let msg = err instanceof Error ? err.message : "Could not create order. Please try again.";
      if (msg.startsWith("[")) {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
            msg = parsed.map((item: any) => item.message).join(", ");
          }
        } catch {
          // ignore JSON parse error
        }
      }
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-[#0F3D24] px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3F8F3F] text-white shadow-inner">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Place Customer Order</h3>
              <p className="text-[11px] text-white/75">
                Logging order as <span className="font-bold uppercase text-[#E6B800]">{role}</span> (@{username || role})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {createdCode ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={34} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#3F8F3F]">
                  Order Created Successfully
                </span>
                <h4 className="mt-1 text-2xl font-black text-[#0F3D24]">{createdCode}</h4>
                <p className="mt-1 text-xs text-slate-600">
                  Customer: <strong>{customerName}</strong> ({phone})
                </p>
              </div>

              <div className="mx-auto max-w-xs rounded-2xl bg-[#F7F5F0] p-4 border border-[#0F3D24]/10 flex items-center justify-between">
                <div className="text-left">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Order & Tracking Code</div>
                  <div className="font-mono text-base font-extrabold text-[#0F3D24]">{createdCode}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-[#0F3D24] shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <Copy size={13} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#3F8F3F] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#347834] transition"
                >
                  <Plus size={15} /> Place Another Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                  className="rounded-full bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form id="admin-quick-order-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Order Type Toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F5F0] p-1.5">
                <button
                  type="button"
                  onClick={() => setMode("now")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition ${
                    mode === "now"
                      ? "bg-[#0F3D24] text-white shadow-sm"
                      : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
                  }`}
                >
                  <Truck size={15} /> Standard / Immediate Order
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preorder")}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition ${
                    mode === "preorder"
                      ? "bg-[#0F3D24] text-white shadow-sm"
                      : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
                  }`}
                >
                  <CalendarClock size={15} /> Scheduled Pre-Order
                </button>
              </div>

              {mode === "preorder" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <label className="block font-bold text-amber-950 mb-1">
                    Preferred Delivery / Pickup Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={preorderDate}
                    onChange={(e) => setPreorderDate(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
                  />
                </div>
              )}

              {/* Customer Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-[#0F3D24] mb-1">
                    <User size={13} className="text-[#3F8F3F]" /> Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mrs. Ngozi Okafor"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-[#0F3D24] mb-1">
                    <Phone size={13} className="text-[#3F8F3F]" /> Customer Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0803 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                  />
                </div>
              </div>

              {/* Delivery Zone & Address */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 font-bold text-[#0F3D24] mb-1">
                    <MapPin size={13} className="text-[#3F8F3F]" /> Location / Fulfillment Area *
                  </label>
                  <select
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 px-3.5 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                  >
                    <optgroup label="Owerri (Free Delivery / Pickup)">
                      {OWERRI_TOWNS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Outside Owerri">
                      <option value={OUTSIDE_TOWN}>{OUTSIDE_TOWN}</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#0F3D24] mb-1">
                    Street Address / Delivery Note
                  </label>
                  <input
                    type="text"
                    placeholder={
                      town === "Farm Pickup (Owerri)"
                        ? "Optional pickup note (defaults to Farm Pickup)"
                        : "House number, street name, landmark"
                    }
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 px-3.5 py-2.5 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold uppercase tracking-wider text-[#0F3D24]/80 text-[11px]">
                    Order Items ({totalQty} total unit{totalQty === 1 ? "" : "s"})
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center gap-1 rounded-full bg-[#3F8F3F]/10 px-3 py-1 text-[11px] font-bold text-[#0F3D24] hover:bg-[#3F8F3F]/20 transition"
                  >
                    <Plus size={13} /> Add Another Product
                  </button>
                </div>

                <div className="space-y-2.5">
                  {lines.map((line, index) => {
                    const prod = PRODUCTS.find((p) => p.id === line.productId) || PRODUCTS[0]!;
                    return (
                      <div
                        key={index}
                        className="grid gap-2 sm:grid-cols-12 items-center rounded-2xl border border-slate-200 bg-[#F7F5F0]/50 p-3"
                      >
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Product
                          </label>
                          <select
                            value={line.productId}
                            onChange={(e) => updateLine(index, { productId: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-semibold text-[#0F3D24]"
                          >
                            {PRODUCTS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Size / Option
                          </label>
                          <select
                            value={line.optionIdx}
                            onChange={(e) => updateLine(index, { optionIdx: Number(e.target.value) })}
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-semibold text-[#0F3D24]"
                          >
                            {prod.options.map((opt, idx) => (
                              <option key={opt.label} value={idx}>
                                {opt.label}
                                {role === "owner" ? ` — ${naira(opt.price)}` : ""}
                                {opt.soldOut ? " (Marked Sold Out)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={line.qty}
                            onChange={(e) =>
                              updateLine(index, { qty: Math.max(1, Number(e.target.value) || 1) })
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 font-bold text-center text-[#0F3D24]"
                          />
                        </div>

                        <div className="sm:col-span-1 flex sm:justify-end pt-4">
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLine(index)}
                              className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 transition"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block font-bold text-[#0F3D24] mb-1">
                  Order Notes / Special Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer requested dressed birds cut into 8 pieces each..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0]/60 px-3.5 py-2 font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F] focus:bg-white"
                />
              </div>

              {/* Summary Box */}
              <div className="rounded-2xl bg-[#0F3D24]/5 p-4 border border-[#0F3D24]/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#0F3D24]/60">
                    Order Summary
                  </div>
                  <div className="text-sm font-black text-[#0F3D24]">
                    {lines.length} product line(s) · {totalQty} total unit(s)
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Zone: {zone === "owerri" ? "Owerri (Free Delivery / Pickup)" : "Outside Owerri"}
                  </div>
                </div>
                {role === "owner" && (
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Total Amount</div>
                    <div className="text-lg font-black text-[#0F3D24]">{naira(total)}</div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                  {errorMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!createdCode && (
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-quick-order-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Creating Order...
                </>
              ) : (
                <>
                  <Plus size={15} /> Submit Customer Order
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
