import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Download,
  Share2,
  X,
  Gift,
  Award,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { drawSocialProofFlyerCanvas, maskName, maskPhone, maskAddress } from "@/lib/flyer-generator";

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
  const [itemsText, setItemsText] = useState(initialOrderData?.itemsText || "Dressed Chicken Medium × 3");
  const [address, setAddress] = useState(initialOrderData?.location || "Ikenegbu, Owerri");
  const [orderCode, setOrderCode] = useState(initialOrderData?.orderCode || "DEC-44851");
  const [maskData, setMaskData] = useState<boolean>(true);

  const [generating, setGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="my-8 w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#0F3D24]/10 bg-[#0F3D24] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#3F8F3F]/30 p-2 text-[#A2E0A2]">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold">Social Proof Flyer Generator</h3>
              <p className="text-xs text-white/70">Create branded promotional posters & verified order graphics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#0F3D24]/10 bg-[#F7F5F0] p-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setMode("social_proof")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 transition ${
              mode === "social_proof" ? "bg-[#0F3D24] text-white shadow-sm" : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
            }`}
          >
            <Award size={15} /> 📦 Order Social Proof Flyer (Brand Poster)
          </button>
          <button
            onClick={() => setMode("promo")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-2.5 transition ${
              mode === "promo" ? "bg-[#0F3D24] text-white shadow-sm" : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
            }`}
          >
            <Gift size={15} /> 🎄 Christmas Promo Flyer
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-2 items-start">
          {/* Controls Form */}
          <div className="space-y-4 text-xs">
            {mode === "social_proof" ? (
              <>
                <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                  <div className="flex items-center gap-2 text-[#0F3D24]">
                    <ShieldCheck size={18} className="text-emerald-600" />
                    <div>
                      <span className="font-bold block">Privacy Identity Masking</span>
                      <span className="text-[11px] text-gray-600">Masks customer full name, phone & address with *****</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={maskData}
                    onChange={(e) => setMaskData(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#0F3D24]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Order Code / Ref
                    <input
                      value={orderCode}
                      onChange={(e) => setOrderCode(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Full Name
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Phone Number
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Order Date
                    <input
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                </div>

                <label className="block font-bold text-[#0F3D24]">
                  Item(s) Ordered
                  <input
                    value={itemsText}
                    onChange={(e) => setItemsText(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                  />
                </label>

                <label className="block font-bold text-[#0F3D24]">
                  Delivery Address / Location
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block font-bold text-[#0F3D24]">
                  Promo Headline
                  <input
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                  />
                </label>
                <label className="block font-bold text-[#0F3D24]">
                  Promo Subtitle
                  <input
                    value={promoSubtitle}
                    onChange={(e) => setPromoSubtitle(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Product Name
                    <input
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Promo Price
                    <input
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-bold text-[#0F3D24]">
                    Badge Tagline
                    <input
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
                  </label>
                  <label className="block font-bold text-[#0F3D24]">
                    Contact Phone
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2 text-xs outline-none focus:border-[#3F8F3F]"
                    />
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
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>{generating ? "Generating..." : "Download High-Res PNG"}</span>
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

          {/* Live High-Res Flyer Render Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-100 p-4 rounded-3xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Official Graphic Canvas Preview
            </span>

            {mode === "social_proof" ? (
              <div className="w-full max-w-[360px] aspect-[1067/1280] rounded-2xl shadow-xl overflow-hidden border border-slate-300 relative bg-white">
                <canvas ref={canvasRef} className="w-full h-full object-contain block" />
              </div>
            ) : (
              <div
                ref={promoRef}
                className="w-full max-w-[360px] aspect-[4/5] bg-gradient-to-br from-[#0F3D24] via-[#134a2c] to-[#0A2918] p-6 text-white rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden ring-4 ring-[#3F8F3F]/30"
              >
                <div className="flex items-center justify-between border-b border-white/15 pb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#3F8F3F] flex items-center justify-center font-extrabold text-xs shadow-md">
                      DAF
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-tight leading-none text-white">
                        DIGNITY AGRO FARMS
                      </h4>
                      <span className="text-[9px] text-[#A2E0A2] font-semibold">QUALITY POULTRY & FARM PRODUCE</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow">
                    OFFICIAL
                  </span>
                </div>

                <div className="my-auto py-4 space-y-3 relative z-10">
                  <div className="inline-block rounded-full bg-[#3F8F3F]/30 px-3 py-1 text-[10px] font-extrabold text-[#A2E0A2] ring-1 ring-[#3F8F3F]">
                    {badgeText}
                  </div>
                  <h2 className="text-xl font-black leading-tight text-amber-300 drop-shadow-sm">{promoTitle}</h2>
                  <p className="text-xs text-white/80 font-medium leading-snug">{promoSubtitle}</p>
                  <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm border border-white/15 space-y-1">
                    <span className="text-[10px] text-white/70 block uppercase font-bold tracking-wider">
                      Featured Deal
                    </span>
                    <div className="font-extrabold text-sm text-white">{productName}</div>
                    <div className="text-lg font-black text-amber-400">{promoPrice}</div>
                  </div>
                </div>

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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
