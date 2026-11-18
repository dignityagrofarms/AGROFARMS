import React, { useRef, useState, useEffect } from "react";
import {
  X,
  FileSignature,
  Upload,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminGetAuthorizedSignature,
  adminSaveAuthorizedSignature,
} from "@/lib/partners.functions";
import { defaultAuthorizedSignaturePng, officialCorporateSealPng } from "@/lib/receipt-logo";

interface AuthorizedSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  passcode: string;
}

export function AuthorizedSignatureModal({
  isOpen,
  onClose,
  passcode,
}: AuthorizedSignatureModalProps) {
  const qc = useQueryClient();
  const getSignatureFn = useServerFn(adminGetAuthorizedSignature);
  const saveSignatureFn = useServerFn(adminSaveAuthorizedSignature);

  const [activeMode, setActiveMode] = useState<"upload" | "draw">("upload");
  const [signatureData, setSignatureData] = useState<string>("");
  const [signatoryName, setSignatoryName] = useState<string>("Managing Director / Chief Executive");
  const [signatoryTitle, setSignatoryTitle] = useState<string>(
    "Dignity Agro Farms Limited · Authorized Signatory",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const strokeCount = useRef(0);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Fetch current saved signature
  const signatureQuery = useQuery({
    queryKey: ["admin-authorized-signature", passcode],
    queryFn: () => getSignatureFn({ data: { passcode } }),
    enabled: isOpen,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (signatureQuery.data) {
      if (signatureQuery.data.signaturePng) {
        setSignatureData(signatureQuery.data.signaturePng);
      }
      if (signatureQuery.data.signatoryName) {
        setSignatoryName(signatureQuery.data.signatoryName);
      }
      if (signatureQuery.data.signatoryTitle) {
        setSignatoryTitle(signatureQuery.data.signatoryTitle);
      }
    }
  }, [signatureQuery.data]);

  if (!isOpen) return null;

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMsg({ type: "error", text: "Please upload a valid image file (PNG or JPG)." });
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setStatusMsg({ type: "error", text: "Signature file size should be less than 2.5 MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSignatureData(result);
      setStatusMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0F3D24";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(((e.clientX - rect.left) * canvas.width) / rect.width, ((e.clientY - rect.top) * canvas.height) / rect.height);

    isDrawing.current = true;
    strokeCount.current = 0;
  };

  const drawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(((e.clientX - rect.left) * canvas.width) / rect.width, ((e.clientY - rect.top) * canvas.height) / rect.height);
    ctx.stroke();
    strokeCount.current++;
  };

  const stopDrawing = () => {
    if (isDrawing.current && strokeCount.current > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        setSignatureData(dataUrl);
        setHasDrawn(true);
      }
    }
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  // Save Signature
  const handleSave = async () => {
    if (!signatureData) {
      setStatusMsg({ type: "error", text: "Please upload or draw a signature before saving." });
      return;
    }

    try {
      setIsSaving(true);
      setStatusMsg(null);
      await saveSignatureFn({
        data: {
          passcode,
          signaturePng: signatureData,
          signatoryName: signatoryName.trim(),
          signatoryTitle: signatoryTitle.trim(),
        },
      });

      await qc.invalidateQueries({ queryKey: ["admin-authorized-signature"] });
      await qc.invalidateQueries({ queryKey: ["public-authorized-signature"] });

      setStatusMsg({
        type: "success",
        text: "Official Managing Director signature and stamp saved successfully! All generated reports and receipts will now embed this signature by default.",
      });

      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save official signature.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isCustomActive = Boolean(signatureQuery.data?.signaturePng);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-black/10 space-y-6 max-h-[92vh] overflow-y-auto text-[#0F3D24]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <ShieldCheck size={14} className="text-[#3F8F3F]" />
            Official Corporate Document Authorization
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0F3D24]">
            Authorized Signature &amp; Seal Settings
          </h2>
          <p className="text-xs text-slate-500">
            Configure your official Managing Director signature. This signature and corporate stamp
            will automatically be stamped on all generated PDF reports, partner statements, and
            sales receipts across the platform.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center justify-between rounded-2xl bg-[#F7F5F0] p-3 text-xs border border-slate-200">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isCustomActive ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            <span className="font-semibold text-slate-700">
              {isCustomActive
                ? "Custom Managing Director Signature Active"
                : "Default Dignity Agro Farms Corporate Seal Active"}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {isCustomActive ? "Custom Upload" : "Standard Stamp"}
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-2xl bg-[#F7F5F0] p-1 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode("upload")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 transition ${
              activeMode === "upload"
                ? "bg-white text-[#0F3D24] shadow-xs font-black"
                : "text-slate-600 hover:text-[#0F3D24]"
            }`}
          >
            <Upload size={14} /> Upload Signature Image
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("draw")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 transition ${
              activeMode === "draw"
                ? "bg-white text-[#0F3D24] shadow-xs font-black"
                : "text-slate-600 hover:text-[#0F3D24]"
            }`}
          >
            <PenTool size={14} /> Draw with Finger / Mouse
          </button>
        </div>

        {/* Mode 1: Upload Image */}
        {activeMode === "upload" && (
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-6 hover:bg-emerald-50/80 transition cursor-pointer text-center group">
              <Upload size={28} className="text-[#3F8F3F] group-hover:scale-110 transition" />
              <span className="mt-2 text-sm font-bold text-[#0F3D24]">
                Click or drag &amp; drop to upload signature
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                PNG with transparent background strongly recommended (JPG also supported, max 2.5 MB)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Mode 2: Draw on Canvas */}
        {activeMode === "draw" && (
          <div className="space-y-2">
            <div className="rounded-2xl border border-slate-300 bg-white p-2">
              <canvas
                ref={canvasRef}
                width={500}
                height={160}
                className="w-full touch-none rounded-xl bg-white cursor-crosshair border border-slate-100"
                onPointerDown={startDrawing}
                onPointerMove={drawMove}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Sign cleanly within the box using finger or stylus</span>
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                <Trash2 size={12} /> Clear Canvas
              </button>
            </div>
          </div>
        )}

        {/* Signatory Details Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Signatory Full Name
            </label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="e.g. Managing Director / Chief Executive"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#0F3D24] focus:border-[#3F8F3F] focus:outline-hidden focus:ring-1 focus:ring-[#3F8F3F]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Official Designation / Title
            </label>
            <input
              type="text"
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
              placeholder="e.g. Dignity Agro Farms Limited · Authorized Signatory"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-[#0F3D24] focus:border-[#3F8F3F] focus:outline-hidden focus:ring-1 focus:ring-[#3F8F3F]"
            />
          </div>
        </div>

        {/* Live Document Preview Card */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Eye size={13} className="text-[#3F8F3F]" /> Live Report Sign-off Box Preview
            </span>
            <span className="text-[11px] text-slate-400">Appearance on exported statements</span>
          </div>

          <div className="rounded-2xl border-2 border-emerald-700/20 bg-[#F7F5F0]/60 p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]">
              OFFICIAL CORPORATE CERTIFICATION &amp; SETTLEMENT SIGN-OFF
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              I hereby certify that this official statement represents the verified financial ledger,
              flock inventory, and operational records of Dignity Agro Farms Limited.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/80 items-end">
              {/* Left Column: Authorized Signature + Seal */}
              <div className="space-y-1">
                <div className="relative h-14 flex items-center">
                  {signatureData ? (
                    <img
                      src={signatureData}
                      alt="Signature Preview"
                      className="max-h-12 max-w-[140px] object-contain"
                    />
                  ) : (
                    <img
                      src={defaultAuthorizedSignaturePng}
                      alt="Default Signature"
                      className="max-h-12 max-w-[140px] object-contain opacity-80"
                    />
                  )}
                  {/* Circular Seal Overlay */}
                  <img
                    src={officialCorporateSealPng}
                    alt="Official Corporate Seal"
                    className="absolute right-0 top-0 h-14 w-14 object-contain drop-shadow-sm select-none pointer-events-none"
                  />
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="text-xs font-bold text-[#0F3D24]">{signatoryName}</p>
                  <p className="text-[10px] text-slate-500">{signatoryTitle}</p>
                </div>
              </div>

              {/* Right Column: Investor Acceptance */}
              <div className="space-y-1">
                <div className="h-14 flex flex-col justify-end pb-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                    <CheckCircle2 size={11} className="text-[#3F8F3F]" />
                    Investor Digital Certificate
                  </span>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <p className="text-xs font-bold text-[#0F3D24]">Investor / Partner</p>
                  <p className="text-[10px] text-slate-500">Digital Agreement · Verified Acceptance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {statusMsg && (
          <div
            className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs font-semibold ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-700 shrink-0 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !signatureData}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#165232] transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving Official Signature...
              </>
            ) : (
              <>
                <FileSignature size={14} /> Save Official Signature
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

