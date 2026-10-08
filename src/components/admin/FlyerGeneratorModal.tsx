import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  ChevronRight,
  ShoppingBag,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { drawSocialProofFlyerCanvas, maskName } from "@/lib/flyer-generator";
import { adminListOrders, type AdminOrder } from "@/lib/orders.functions";

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
  passcode?: string;
}

export function FlyerGeneratorModal({ isOpen, onClose, initialOrderData, passcode: propPasscode }: FlyerGeneratorModalProps) {
  const [mode, setMode] = useState<"promo" | "social_proof">(initialOrderData ? "social_proof" : "promo");
  const listOrdersFn = useServerFn(adminListOrders);

  // Retrieve passcode for database order queries
  const [adminPasscode, setAdminPasscode] = useState(propPasscode || "");

  useEffect(() => {
    if (typeof window !== "undefined" && !adminPasscode) {
      const saved =
        localStorage.getItem("daf_admin_passcode") ||
        localStorage.getItem("agrofarms_admin_passcode") ||
        "";
      if (saved) setAdminPasscode(saved);
    }
  }, [adminPasscode]);

  // Fetch verified customer orders for 1-click social proof flyer creation
  const ordersQuery = useQuery({
    queryKey: ["admin-orders-flyer-select", adminPasscode],
    queryFn: () => listOrdersFn({ data: { passcode: adminPasscode } }),
    enabled: isOpen && Boolean(adminPasscode),
    staleTime: 30000,
  });

  const availableOrders: AdminOrder[] = ordersQuery.data?.orders || [];

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

  // Auto-fill flyer fields when a verified order is selected from the list
  const applyOrderToFlyer = (ord: AdminOrder | FlyerOrderData) => {
    setCustomerName(ord.customerName);
    setPhone("phone" in ord && ord.phone ? ord.phone : "07012345678");
    setOrderCode(ord.orderCode);
    setAddress("location" in ord ? ord.location : (ord as AdminOrder).address || "Owerri, Imo State");
    
    if ("itemsText" in ord && ord.itemsText) {
      setItemsText(ord.itemsText);
    } else if ("items" in ord && Array.isArray((ord as AdminOrder).items)) {
      setItemsText((ord as AdminOrder).items.map((i) => `${i.product} × ${i.qty}`).join(", "));
    }

    if ("orderDate" in ord && ord.orderDate) {
      setOrderDate(ord.orderDate);
    } else if ("createdAt" in ord) {
      setOrderDate(
        new Date((ord as AdminOrder).createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    }
  };

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
        link.download = `DignityAgroFarms_ChristmasPromo_${Date.now()}.png`;
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
      const promoCaption = `🎄 *Dignity Agro Farms Special Christmas Promo!*\n${productName} @ ${promoPrice}\n${promoSubtitle}\n\nOrder online: https://dignityagrofarms.com\nFollow us on IG/FB: @dignityagrofarms`;
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
              <Sparkles size={18} className="sm:w-5 sm:h-5 text-amber-300" />
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
              <span className="truncate">🎄 Christmas Promo</span>
            </button>
          </div>
        </div>

        {/* Scrollable Main Section: Form & Graphic Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Form Inputs Column */}
          <div className="space-y-4 text-xs">
            {mode === "social_proof" ? (
              <>



                {/* Privacy Masking Toggle */}
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
              /* LUXURY CHRISTMAS PROMO FLYER DESIGN (MATCHES IMAGE 2) */
              <div
                ref={promoRef}
                className="w-full max-w-[320px] sm:max-w-[370px] aspect-[4/5] bg-[#FAF8F3] border-[3px] border-[#D4AF37] rounded-3xl p-4 sm:p-5 text-[#0F3D24] shadow-2xl flex flex-col justify-between relative overflow-hidden ring-4 ring-[#D4AF37]/20"
                style={{
                  backgroundImage: "radial-gradient(#D4AF37 0.5px, transparent 0.5px)",
                  backgroundSize: "18px 18px",
                }}
              >
                {/* SVG Corner Decorations: Pine Branches, Holly Berries & Hanging Gold Baubles */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                  <defs>
                    <radialGradient id="goldSphere1" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#FFF4B8" />
                      <stop offset="35%" stopColor="#F3D278" />
                      <stop offset="70%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#876611" />
                    </radialGradient>
                    <radialGradient id="goldSphere2" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#FFF8D6" />
                      <stop offset="40%" stopColor="#E5C158" />
                      <stop offset="80%" stopColor="#B38B22" />
                      <stop offset="100%" stopColor="#664D0A" />
                    </radialGradient>
                    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Top-Left Pine Foliage & Red Holly Berries */}
                  <g transform="translate(-10, -10)">
                    <path d="M0,0 Q30,10 60,40 Q30,50 0,60 Z" fill="#143B23" opacity="0.85" />
                    <path d="M10,-5 Q50,20 80,25 Q40,45 10,40 Z" fill="#1B4F30" opacity="0.9" />
                    <path d="M-5,15 Q35,35 50,75 Q20,60 -5,45 Z" fill="#0F3D24" opacity="0.85" />
                    {/* Red Holly Berries */}
                    <circle cx="45" cy="35" r="4.5" fill="#D32F2F" />
                    <circle cx="53" cy="30" r="4" fill="#B71C1C" />
                    <circle cx="48" cy="42" r="4" fill="#E53935" />
                    <circle cx="46" cy="34" r="1.5" fill="#FFEBEE" opacity="0.8" />
                  </g>

                  {/* Top-Right Pine Foliage & 2 Hanging Golden Xmas Ornament Baubles */}
                  <g transform="translate(100%, 0) scale(-1, 1)" style={{ transformOrigin: "top right" }}>
                    <path d="M-10,-10 Q30,10 70,35 Q40,55 -10,70 Z" fill="#143B23" opacity="0.85" />
                    <path d="M0,5 Q50,25 90,30 Q40,60 0,45 Z" fill="#1B4F30" opacity="0.9" />
                    {/* Red Holly Berries */}
                    <circle cx="50" cy="30" r="4.5" fill="#D32F2F" />
                    <circle cx="58" cy="25" r="4" fill="#B71C1C" />
                  </g>

                  {/* Top-Right Hanging Gold Baubles (rendered rightwards correctly) */}
                  <g className="absolute top-0 right-0">
                    {/* Bauble 1 (Larger, Left) */}
                    <line x1="82%" y1="0" x2="82%" y2="48" stroke="#D4AF37" strokeWidth="1.2" />
                    <rect x="80.5%" y="46" width="3%" height="4" fill="#B38B22" rx="1" />
                    <circle cx="82%" cy="64" r="16" fill="url(#goldSphere1)" filter="url(#goldGlow)" />
                    {/* Bauble 2 (Smaller, Right, Suspended lower) */}
                    <line x1="93%" y1="0" x2="93%" y2="85" stroke="#D4AF37" strokeWidth="1" />
                    <rect x="91.8%" y="83" width="2.4%" height="3.5" fill="#B38B22" rx="1" />
                    <circle cx="93%" cy="98" r="12" fill="url(#goldSphere2)" filter="url(#goldGlow)" />
                  </g>

                  {/* Bottom-Left Pine Branch */}
                  <g transform="translate(0, 100%) scale(1, -1)" style={{ transformOrigin: "bottom left" }}>
                    <path d="M-10,-10 Q30,15 65,45 Q25,60 -10,65 Z" fill="#143B23" opacity="0.85" />
                    <circle cx="45" cy="35" r="4" fill="#D32F2F" />
                    <circle cx="52" cy="30" r="3.5" fill="#B71C1C" />
                  </g>

                  {/* Bottom-Right Pine Branch */}
                  <g transform="translate(100%, 100%) scale(-1, -1)" style={{ transformOrigin: "bottom right" }}>
                    <path d="M-10,-10 Q30,15 65,45 Q25,60 -10,65 Z" fill="#143B23" opacity="0.85" />
                    <circle cx="45" cy="35" r="4" fill="#D32F2F" />
                    <circle cx="52" cy="30" r="3.5" fill="#B71C1C" />
                  </g>

                  {/* Floating Gold Sparkle Stars */}
                  <g fill="#D4AF37">
                    <path d="M120,40 L122,46 L128,48 L122,50 L120,56 L118,50 L112,48 L118,46 Z" opacity="0.7" />
                    <path d="M220,90 L221.5,95 L226.5,96.5 L221.5,98 L220,103 L218.5,98 L213.5,96.5 L218.5,95 Z" opacity="0.8" />
                    <path d="M60,190 L61.5,195 L66.5,196.5 L61.5,198 L60,203 L58.5,198 L53.5,196.5 L58.5,195 Z" opacity="0.6" />
                    <path d="M270,220 L271.5,225 L276.5,226.5 L271.5,228 L270,233 L268.5,228 L263.5,226.5 L268.5,225 Z" opacity="0.75" />
                  </g>
                </svg>

                {/* Header: Logo, Title & Official Deal Badge */}
                <div className="flex items-center justify-between relative z-10 pt-1 pb-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#0F3D24] p-0.5 border-2 border-[#D4AF37] ring-2 ring-[#F5DB89]/80 shadow-md flex items-center justify-center shrink-0">
                      <img
                        src={logo}
                        alt="Dignity Agro Farms"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-serif font-black text-xs sm:text-sm tracking-tight text-[#0F3D24] uppercase leading-tight">
                        DIGNITY AGRO<br />FARMS
                      </h4>
                      <span className="text-[7.5px] sm:text-[8.5px] text-[#1B4F30] font-extrabold uppercase tracking-wider block mt-0.5">
                        QUALITY POULTRY & FARM PRODUCE
                      </span>
                    </div>
                  </div>
                  <span className="text-[8px] sm:text-[9.5px] font-black uppercase bg-gradient-to-r from-[#F5DB89] via-[#D4AF37] to-[#B38B22] text-[#0F3D24] px-2.5 py-1 rounded-full shadow-md border border-[#FFF5D1] tracking-wider shrink-0">
                    OFFICIAL DEAL
                  </span>
                </div>

                {/* Gold Horizontal Line Divider */}
                <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-1.5 relative z-10" />

                {/* Middle Content */}
                <div className="my-auto py-1 space-y-2 relative z-10">
                  <div className="inline-block rounded-full bg-[#0F3D24] border-2 border-[#D4AF37] px-3 py-1 text-[8.5px] sm:text-[9.5px] font-extrabold text-[#F5DB89] tracking-wider shadow-sm">
                    {badgeText}
                  </div>

                  <h2 className="text-base sm:text-xl font-serif font-black leading-tight text-[#0F3D24] drop-shadow-xs">
                    🎄 {promoTitle.replace(/^🎄\s*/, "")} ✨
                  </h2>
                  <p className="text-[11px] sm:text-xs text-[#143B23] font-semibold leading-snug">{promoSubtitle}</p>

                  {/* Featured Holiday Deal Luxury Card (With Dressed Chicken & Egg Graphic) */}
                  <div className="rounded-2xl bg-gradient-to-r from-white via-[#FFFDF8] to-[#FFF9ED] border-2 border-[#D4AF37] p-3 sm:p-3.5 shadow-xl shadow-amber-500/10 flex items-center justify-between relative overflow-hidden">
                    <div className="z-10 max-w-[62%]">
                      <span className="text-[8px] sm:text-[9px] text-[#B38B22] block uppercase font-black tracking-widest">
                        FEATURED HOLIDAY DEAL
                      </span>
                      <div className="font-extrabold text-xs sm:text-sm text-[#0F3D24] leading-snug mt-0.5">
                        {productName}
                      </div>
                      <div className="text-sm sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#E67E22] to-[#B38B22] mt-1 font-mono">
                        {promoPrice}
                      </div>
                    </div>

                    {/* Right Graphic: Whole Dressed Chicken & Basket of Eggs */}
                    <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100 to-amber-200/50 border-2 border-[#D4AF37]/60 shadow-inner" />
                      <img
                        src="/assets/dressed-chicken.jpg"
                        alt="Dressed Chicken & Eggs"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover relative z-10 border border-white shadow-md"
                        onError={(e) => {
                          // Fallback icon visual if image fails
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                      {/* Festive Holly & Egg Basket Accent Overlay */}
                      <span className="absolute -bottom-1 -right-1 text-base sm:text-lg z-20 drop-shadow-md">
                        🧺🥚
                      </span>
                      <span className="absolute -top-1 -left-1 text-xs sm:text-sm z-20 drop-shadow-md">
                        🎀
                      </span>
                    </div>

                    {/* Subtle Card Background Accent */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#F5DB89]/15 to-transparent z-0 pointer-events-none" />
                  </div>
                </div>

                {/* Footer: Gold Line, Phone, Social Handles & Website */}
                <div className="relative z-10 pt-1">
                  <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent mb-2" />
                  <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-[#0F3D24] font-bold">
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm">📲</span>
                      <div>
                        <span className="block font-semibold text-[8px] text-[#0F3D24]/70 leading-none">Call / WhatsApp:</span>
                        <span className="font-mono text-[#B38B22] text-[10px] sm:text-[11px] font-black">{contactPhone}</span>
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center gap-0.5 justify-center">
                        <span className="text-[9px]">🌐</span>
                        <span className="text-[#0F3D24] font-bold text-[9px]">Social Handles:</span>
                      </div>
                      <span className="text-[#3F8F3F] font-black text-[9.5px] block">@dignityagrofarms</span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[9px]">🌐</span>
                        <span className="font-bold text-[#0F3D24] text-[9.5px]">dignityagrofarms.com</span>
                      </div>
                      <div className="flex items-center gap-0.5 justify-end text-[#B38B22] text-[8.5px] font-bold">
                        <span>📍</span>
                        <span>Owerri, Imo State</span>
                      </div>
                    </div>
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

