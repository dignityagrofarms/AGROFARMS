import React, { useState, useRef } from "react";
import {
  Sparkles,
  Download,
  Share2,
  X,
  Image as ImageIcon,
  CheckCircle2,
  Gift,
  ShoppingBag,
  Award,
  Layers,
  Copy,
} from "lucide-react";

export interface FlyerOrderData {
  orderCode: string;
  customerName: string;
  location: string;
  itemsText: string;
  totalAmount: number;
  paymentStatus: string;
}

interface FlyerGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderData?: FlyerOrderData | null;
}

export function FlyerGeneratorModal({ isOpen, onClose, initialOrderData }: FlyerGeneratorModalProps) {
  const [mode, setMode] = useState<"promo" | "social_proof">(initialOrderData ? "social_proof" : "promo");
  
  // Promo Flyer Form State
  const [promoTitle, setPromoTitle] = useState("🎄 Christmas & Holiday Poultry Special");
  const [promoSubtitle, setPromoSubtitle] = useState("Reserve Your Farm-Fresh Broilers & Eggs Early");
  const [productName, setProductName] = useState("Jumbo Dressed Broiler Chicken");
  const [promoPrice, setPromoPrice] = useState("₦6,000 / per bird");
  const [badgeText, setBadgeText] = useState("LOCK IN YOUR PRICE NOW");
  const [contactPhone, setContactPhone] = useState("09071934173");
  const [locationText, setLocationText] = useState("Owerri Town & Surrounding Environs");

  // Social Proof Order Flyer State
  const [orderCode, setOrderCode] = useState(initialOrderData?.orderCode || "DEC-44851");
  const [customerName, setCustomerName] = useState(initialOrderData?.customerName || "Verified Customer");
  const [orderLocation, setOrderLocation] = useState(initialOrderData?.location || "Owerri, Imo State");
  const [itemsText, setItemsText] = useState(initialOrderData?.itemsText || "Dressed Chicken Medium × 3");
  const [orderTotal, setOrderTotal] = useState(initialOrderData?.totalAmount ? `₦${initialOrderData.totalAmount.toLocaleString()}` : "₦24,500");

  const [generating, setGenerating] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Convert HTML div to PNG image download using html-to-image or html2canvas fallback
  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    setGenerating(true);
    try {
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(flyerRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = mode === "promo" ? `DignityAgroFarms_Promo_Flyer_${Date.now()}.png` : `DignityAgroFarms_OrderProof_${orderCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("Failed to generate flyer image: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = mode === "promo"
      ? `🎄 *Dignity Agro Farms Christmas Special Promo!*\n\n${productName} @ ${promoPrice}\n${promoSubtitle}\n\n📲 Order now: https://dignityagrofarms.com or call ${contactPhone}`
      : `📦 *Order Verified & Reserved!*\nOrder Ref: ${orderCode}\nLocation: ${orderLocation}\nItems: ${itemsText}\n\nReserve your poultry at https://dignityagrofarms.com`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2 text-[#A2E0A2]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Digital Flyer Generator</h3>
              <p className="text-xs text-white/70">Create branded promotional posters & order verification graphics</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#0F3D24]/10 bg-[#F7F5F0] p-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setMode("promo")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 transition ${
              mode === "promo" ? "bg-[#0F3D24] text-white shadow-sm" : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
            }`}
          >
            <Gift size={15} /> 🎄 Christmas Promo Flyer
          </button>
          <button
            onClick={() => setMode("social_proof")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 transition ${
              mode === "social_proof" ? "bg-[#0F3D24] text-white shadow-sm" : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
            }`}
          >
            <Award size={15} /> 📦 Order Social Proof Flyer
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2 items-start">
          {/* Controls Form */}
          <div className="space-y-4 text-xs">
            {mode === "promo" ? (
              <>
                <label className="block font-bold text-[#0F3D24]">
                  Promo Headline
                  <input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                </label>
                <label className="block font-bold text-[#0F3D24]">
                  Promo Subtitle
                  <input value={promoSubtitle} onChange={(e) => setPromoSubtitle(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Product Name
                    <input value={productName} onChange={(e) => setProductName(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Promo Price
                    <input value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Badge Tagline
                    <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Contact Phone
                    <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Order Reference Code
                    <input value={orderCode} onChange={(e) => setOrderCode(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Customer Name
                    <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                </div>
                <label className="block font-bold text-[#0F3D24]">
                  Location / Delivery Area
                  <input value={orderLocation} onChange={(e) => setOrderLocation(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Items Summary
                    <input value={itemsText} onChange={(e) => setItemsText(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Order Total
                    <input value={orderTotal} onChange={(e) => setOrderTotal(e.target.value)} className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]" />
                  </label>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={handleDownloadFlyer}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#0F3D24] py-3 text-xs font-bold text-white shadow-md hover:bg-[#134a2c] disabled:opacity-60 transition"
              >
                <Download size={15} /> {generating ? "Generating..." : "Download PNG Flyer"}
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-xs font-bold text-white shadow-md hover:bg-[#1ebf59] transition"
              >
                <Share2 size={15} /> WhatsApp
              </button>
            </div>
          </div>

          {/* Live High-Res Flyer Render Canvas */}
          <div className="flex flex-col items-center justify-center bg-slate-100 p-4 rounded-3xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Live Graphic Preview</span>
            <div
              ref={flyerRef}
              className="w-full max-w-[360px] aspect-[4/5] bg-gradient-to-br from-[#0F3D24] via-[#134a2c] to-[#0A2918] p-6 text-white rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden ring-4 ring-[#3F8F3F]/30"
            >
              {/* Background Accent Graphics */}
              <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#3F8F3F]/15 blur-2xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

              {/* Header Logo & Brand */}
              <div className="flex items-center justify-between border-b border-white/15 pb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#3F8F3F] flex items-center justify-center font-extrabold text-xs shadow-md">
                    DAF
                  </div>
                  <div>
                    <h4 className="font-black text-sm tracking-tight leading-none text-white">DIGNITY AGRO FARMS</h4>
                    <span className="text-[9px] text-[#A2E0A2] font-semibold">QUALITY POULTRY & FARM PRODUCE</span>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow">
                  OFFICIAL
                </span>
              </div>

              {/* Main Body Content */}
              {mode === "promo" ? (
                <div className="my-auto py-4 space-y-3 relative z-10">
                  <div className="inline-block rounded-full bg-[#3F8F3F]/30 px-3 py-1 text-[10px] font-extrabold text-[#A2E0A2] ring-1 ring-[#3F8F3F]">
                    {badgeText}
                  </div>
                  <h2 className="text-xl font-black leading-tight text-amber-300 drop-shadow-sm">
                    {promoTitle}
                  </h2>
                  <p className="text-xs text-white/80 font-medium leading-snug">
                    {promoSubtitle}
                  </p>
                  <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/15 space-y-1">
                    <span className="text-[10px] text-white/70 block uppercase font-bold tracking-wider">Featured Deal</span>
                    <div className="font-extrabold text-sm text-white">{productName}</div>
                    <div className="text-lg font-black text-amber-400">{promoPrice}</div>
                  </div>
                </div>
              ) : (
                <div className="my-auto py-4 space-y-3 relative z-10">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
                    <CheckCircle2 size={12} /> VERIFIED ORDER RESERVED
                  </div>
                  <div className="text-2xl font-black font-mono tracking-wider text-amber-300">
                    {orderCode}
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/15 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-white/70">Customer:</span>
                      <span className="font-bold text-white">{customerName}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-white/70">Location:</span>
                      <span className="font-bold text-[#A2E0A2]">{orderLocation}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-white/70">Items:</span>
                      <span className="font-semibold text-white">{itemsText}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-white/70">Total Value:</span>
                      <span className="font-black text-amber-400 text-sm">{orderTotal}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Bar */}
              <div className="border-t border-white/15 pt-3 flex items-center justify-between text-[10px] text-white/80 relative z-10">
                <div>
                  <span className="block font-bold">📲 Call / WhatsApp:</span>
                  <span className="font-mono text-amber-300">{contactPhone}</span>
                </div>
                <div className="text-right">
                  <span className="block font-semibold">dignityagrofarms.com</span>
                  <span className="text-[9px] text-[#A2E0A2]">Owerri, Imo State</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
