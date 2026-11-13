import React from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export interface TypoReviewField {
  label: string;
  value: string;
  highlight?: boolean;
}

interface TypoReviewModalProps {
  open: boolean;
  title?: string;
  subtitle?: string;
  fields: TypoReviewField[];
  isSubmitting?: boolean;
  confirmLabel?: string;
  onBack: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation step displayed to Staff/Managers after filling or editing a farm entry,
 * prompting them to verify numbers, batch, date, and spelling for typos before sending to the Owner.
 */
export function TypoReviewModal({
  open,
  title = "Review Entry for Typos",
  subtitle = "Double-check every figure, spelling, batch, and date before submitting. Once confirmed, it will be sent to the Farm Owner to approve or decline.",
  fields,
  isSubmitting = false,
  confirmLabel = "No Typos — Confirm & Submit",
  onBack,
  onConfirm,
}: TypoReviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#0F3D24]">{title}</h3>
            <p className="mt-0.5 text-xs text-amber-900/80 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/70 divide-y divide-[#0F3D24]/10 max-h-72 overflow-y-auto">
            {fields
              .filter((f) => Boolean(f.value))
              .map((field, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2.5 flex items-start justify-between gap-3 text-xs"
                >
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#0F3D24]/60 shrink-0 pt-0.5">
                    {field.label}
                  </span>
                  <span
                    className={`text-right break-words ${
                      field.highlight
                        ? "font-black text-sm text-[#0F3D24] tabular-nums"
                        : "font-semibold text-[#0F3D24]"
                    }`}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
          </div>

          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-[11px] font-medium text-emerald-900 flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-700 shrink-0" />
            <span>
              Check extra zeros in amounts, feed bags/kg, batch name, and description spelling.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition"
            >
              <ArrowLeft size={14} /> Go Back &amp; Fix
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
