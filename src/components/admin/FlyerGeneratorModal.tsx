import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Download,
  Share2,
  X,
  Gift,
  Award,
  ShieldCheck,
  Loader2,
  Eye,
} from "lucide-react";
import { drawSocialProofFlyerCanvas, maskName } from "@/lib/flyer-generator";

export interface FlyerOrderData {
  orderCode: string;
  customerName: string;
  location: string;
  itemsText: string;
  totalAmount: number;
  paymentStatus: string;
  phone?: string;
  orderDate?: string;
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
  const [contactPhone, setContactPhone] = useState("08167099492");

  // Social Proof Order Flyer State
  const [customerName, setCustomerName] = useState(initialOrderData?.customerName || "Emeka Okonkwo");
  const [phone, setPhone] = useState(initialOrderData?.phone || "07012345678");
  const [orderDate, setOrderDate] = useState(
    initialOrderData?.orderDate ||
      new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  );
  const [itemsText, setItemsText] = useState(initialOrderData?.itemsText || "Dressed Chicken Medium × 3, Fresh Eggs × 2");
  const [address, setAddress] = useState(initialOrderData?.location || "Ikenegbu, Owerri");
  const [orderCode, setOrderCode] = useState(initialOrderData?.orderCode || "DEC-44851");
  const [maskData, setMaskData] = useState<boolean>(true);

  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const promoRef = useRef<HTMLDivElement | null>(null);

  // Redraw canvas whenever form fields or mode change
  useEffect(() => {
    if (!isOpen || mode !== "social_proof" || !canvasRef.current) return;

    drawSocialProofFlyerCanvas(canvasRef.current, {
      customerName,
      phone,
      orderDate,
      itemsText,
      address,
      orderCode,
      maskData,
    }).catch((err) => console.error("Canvas draw error:", err));
  }, [isOpen, mode, customerName, phone, orderDate, itemsText, address, orderCode, maskData]);

  if (!isOpen) return null;

  const handleDownloadFlyer = async () => {
    setGenerating(true);
    try {
      if (mode === "social_proof" && canvasRef.current) {
        const link = document.createElement("a");
        link.download = `DignityAgroFarms_OrderProof_${orderCode || Date.now()}.png`;
        link.href = canvasRef.current.toDataURL("image/png", 1.0);
        link.click();
      } else if (mode === "promo" && promoRef.current) {
        const htmlToImage = await import("html-to-image");
        const dataUrl = await htmlToImage.toPng(promoRef.current, { quality: 0.95, pixelRatio: 2 });
        const link = document.createElement("a");
        link.download = `DignityAgroFarms_Promo_Flyer_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      alert("Failed to generate flyer image: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (mode === "social_proof" && canvasRef.current) {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvasRef.current?.toBlob(resolve, "image/png", 1.0)
        );
        const file = blob
          ? new File([blob], `Dignity_OrderProof_${orderCode}.png`, { type: "image/png" })
          : null;

        const captionText = `📦 *New Order Confirmed & Verified!*\nOrder Ref: #${orderCode}\nCustomer: ${
          maskData ? maskName(customerName) : customerName
        }\nItems: ${itemsText}\n\nReserve your poultry at https://dignityagrofarms.com`;

        if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "Dignity Agro Farms Order Proof",
            text: captionText,
            files: [file],
          });
          return;
        }

        window.open(`https://wa.me/?text=${encodeURIComponent(captionText)}`, "_blank", "noopener,noreferrer");
      } catch {
        // Fallback
      }
    } else {
      const promoCaption = `🎄 *Dignity Agro Farms Special Promo!*\n${productName} @ ${promoPrice}\n${promoSubtitle}\n\nOrder online: https://dignityagrofarms.com`;
      window.open(`https://wa.me/?text=${encodeURIComponent(promoCaption)}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="w-full h-[96dvh] sm:h-auto sm:max-h-[92vh] max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-4 sm:px-6 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2 text-[#A2E0A2] shrink-0">
              <Sparkles size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">Flyer & Social Proof Generator</h3>
              <p className="text-[11px] text-white/70 hidden sm:block">
                Branded promotional posters & verified order proof graphics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Segmented Mode Selector Tabs (Mobile First) */}
        <div className="p-2 sm:p-3 bg-[#F7F5F0] border-b border-[#0F3D24]/10 shrink-0">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold max-w-md mx-auto sm:max-w-none">
            <button
              onClick={() => setMode("social_proof")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 transition-all text-xs ${
                mode === "social_proof"
                  ? "bg-[#0F3D24] text-white shadow-md ring-2 ring-[#0F3D24]/20"
                  : "bg-white/80 text-[#0F3D24]/80 hover:bg-white border border-[#0F3D24]/10"
              }`}
            >
              <Award size={15} className="shrink-0 text-amber-400" />
              <span className="truncate">Order Social Proof</span>
            </button>
            <button
              onClick={() => setMode("promo")}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 transition-all text-xs ${
                mode === "promo"
                  ? "bg-[#0F3D24] text-white shadow-md ring-2 ring-[#0F3D24]/20"
                  : "bg-white/80 text-[#0F3D24]/80 hover:bg-white border border-[#0F3D24]/10"
              }`}
            >
              <Gift size={15} className="shrink-0 text-amber-400" />
              <span className="truncate">Promo Poster</span>
            </button>
          </div>
        </div>

        {/* Scrollable Main Section: Form & Graphic Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Form Inputs Column */}
          <div className="space-y-4 text-xs">
            {mode === "social_proof" ? (
              <>
                <div className="flex items-center justify-between bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200/80 shadow-sm">
                  <div className="flex items-center gap-2.5 text-[#0F3D24] pr-2">
                    <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs block">Privacy Identity Masking</span>
                      <span className="text-[11px] text-gray-600 block leading-tight">Mask customer name, phone & address with *****</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={maskData}
                    onChange={(e) => setMaskData(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#0F3D24] cursor-pointer shrink-0"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Order Code / Ref</label>
                    <input
                      value={orderCode}
                      onChange={(e) => setOrderCode(e.target.value)}
                      placeholder="e.g. DEC-44851"
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Customer Full Name</label>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Emeka Okonkwo"
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Phone Number</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 07012345678"
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Order Date</label>
                    <input
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      placeholder="e.g. 07 Oct 2026"
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Item(s) Ordered</label>
                  <input
                    value={itemsText}
                    onChange={(e) => setItemsText(e.target.value)}
                    placeholder="e.g. Dressed Chicken Medium × 3, Fresh Eggs × 2"
                    className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Delivery Address / Location</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Ikenegbu, Owerri"
                    className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Promo Headline</label>
                  <input
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">Promo Subtitle</label>
                  <input
                    value={promoSubtitle}
                    onChange={(e) => setPromoSubtitle(e.target.value)}
                    className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Product Name</label>
                    <input
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Promo Price</label>
                    <input
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Badge Tagline</label>
                    <input
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F3D24] mb-1">Contact Phone</label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#0F3D24]/20 px-3.5 py-2.5 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/20 bg-white"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Graphic Canvas Live Preview Column */}
          <div className="flex flex-col items-center justify-center bg-slate-100/80 p-4 sm:p-5 rounded-3xl border border-slate-200 lg:sticky lg:top-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Eye size={14} className="text-[#3F8F3F]" />
              Official Graphic Canvas Preview
            </span>

            {mode === "social_proof" ? (
              <div className="w-full max-w-[290px] sm:max-w-[340px] aspect-[1067/1280] rounded-2xl shadow-xl overflow-hidden border border-slate-300 relative bg-white">
                <canvas ref={canvasRef} className="w-full h-full object-contain block" />
              </div>
            ) : (
              <div
                ref={promoRef}
                className="w-full max-w-[290px] sm:max-w-[340px] aspect-[4/5] bg-gradient-to-br from-[#0F3D24] via-[#134a2c] to-[#0A2918] p-5 sm:p-6 text-white rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden ring-4 ring-[#3F8F3F]/30"
              >
                <div className="flex items-center justify-between border-b border-white/15 pb-3.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#3F8F3F] flex items-center justify-center font-extrabold text-xs shadow-md shrink-0">
                      DAF
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm tracking-tight leading-none text-white">
                        DIGNITY AGRO FARMS
                      </h4>
                      <span className="text-[9px] text-[#A2E0A2] font-semibold">QUALITY POULTRY & FARM PRODUCE</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow shrink-0">
                    OFFICIAL
                  </span>
                </div>

                <div className="my-auto py-3 space-y-2.5 relative z-10">
                  <div className="inline-block rounded-full bg-[#3F8F3F]/30 px-2.5 py-0.5 text-[10px] font-extrabold text-[#A2E0A2] ring-1 ring-[#3F8F3F]">
                    {badgeText}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black leading-tight text-amber-300 drop-shadow-sm">{promoTitle}</h2>
                  <p className="text-xs text-white/80 font-medium leading-snug">{promoSubtitle}</p>
                  <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm border border-white/15 space-y-0.5">
                    <span className="text-[9px] text-white/70 block uppercase font-bold tracking-wider">
                      Featured Deal
                    </span>
                    <div className="font-extrabold text-xs sm:text-sm text-white">{productName}</div>
                    <div className="text-base sm:text-lg font-black text-amber-400">{promoPrice}</div>
                  </div>
                </div>

                <div className="border-t border-white/15 pt-2.5 flex items-center justify-between text-[10px] text-white/80 relative z-10">
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
            )}
          </div>
        </div>

        {/* Sticky Action Footer (Mobile First with high visibility & clearance) */}
        <div className="p-3.5 sm:p-4 border-t border-[#0F3D24]/10 bg-white shrink-0 shadow-lg z-20 pb-8 sm:pb-4">
          <div className="flex flex-col sm:flex-row gap-2.5 max-w-xl mx-auto">
            <button
              type="button"
              onClick={handleDownloadFlyer}
              disabled={generating}
              className="w-full flex-1 py-3 px-4 bg-[#0F3D24] text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#134a2c] active:scale-[0.98] disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-md"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{generating ? "Generating PNG..." : "Download High-Res PNG"}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full flex-1 py-3 px-4 bg-[#25D366] text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-[#1ebf59] active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-md"
            >
              <Share2 size={16} />
              <span>Share to WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
