import React from "react";
import { X, Receipt, ShieldCheck, Printer } from "lucide-react";
import type { PartnerFinancial } from "@/lib/partners.functions";

export function DigitalSalesReceiptModal({
  receipt,
  partnerName,
  batchName,
  onClose,
}: {
  receipt: PartnerFinancial;
  partnerName: string;
  batchName?: string | null;
  onClose: () => void;
}) {
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=850,height=950");
    if (!w) return;
    const refCode = receipt.referenceNo || `DAF-SLS-${receipt.id.slice(0, 8).toUpperCase()}`;
    const birdsQty = receipt.birdsSold ? `${receipt.birdsSold} birds` : "Direct Farm Sales";
    const formattedAmount = Number(receipt.amount).toLocaleString("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    });
    const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Official Sales Receipt - ${refCode}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:40px;color:#0F3D24;background:#fff;font-size:14px;line-height:1.5}
.sheet{max-width:760px;margin:0 auto;border:2px solid #0F3D2415;border-radius:20px;padding:36px;background:#fff}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F3D2415;padding-bottom:20px;margin-bottom:24px}
.brand{font-size:24px;font-weight:900;color:#0F3D24;letter-spacing:-0.5px}
.brand small{display:block;font-size:11px;font-weight:600;color:#3F8F3F;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px}
.title-box{text-align:right}
.doc-title{font-size:18px;font-weight:800;color:#0F3D24;text-transform:uppercase;letter-spacing:0.5px}
.doc-sub{font-size:12px;color:#555;margin-top:4px;font-family:monospace}
.stamp{display:inline-flex;align-items:center;gap:6px;margin-top:16px;padding:6px 14px;background:#e6f4ea;color:#137333;border:1px solid #ceead6;border-radius:999px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0;padding:20px;background:#F7F5F0;border-radius:14px}
.field{margin-bottom:8px}
.field:last-child{margin-bottom:0}
.label{font-size:11px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.5px}
.val{font-size:14px;font-weight:700;color:#0F3D24}
table{width:100%;border-collapse:collapse;margin:24px 0}
th{background:#0F3D24;color:#fff;padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;font-weight:700}
td{padding:14px;border-bottom:1px solid #0F3D2415}
.amount-box{margin-top:20px;margin-left:auto;width:340px;background:#F7F5F0;border-radius:14px;padding:20px;border:1px solid #0F3D2415}
.amount-row{display:flex;justify-content:space-between;align-items:baseline}
.amount-total{font-size:24px;font-weight:900;color:#0F3D24}
.footer{margin-top:36px;padding-top:20px;border-top:1px solid #0F3D2415;text-align:center;font-size:12px;color:#777}
@media print{body{padding:0}.sheet{border:none;padding:20px}}
</style></head><body>
<div class="sheet">
  <div class="head">
    <div class="brand">
      Dignity Agro Farms
      <small>Limited · Agriculture & Livestock Management</small>
    </div>
    <div class="title-box">
      <div class="doc-title">Official Sales Receipt</div>
      <div class="doc-sub">Ref: ${refCode}</div>
      <div class="doc-sub">Date: ${receipt.transactionDate}</div>
    </div>
  </div>
  <div>
    <span class="stamp">✓ Verified &amp; Audited Farm Income</span>
  </div>
  <div class="grid">
    <div>
      <div class="field"><div class="label">Product / Category</div><div class="val">${receipt.category}</div></div>
      <div class="field"><div class="label">Pen Batch</div><div class="val">${batchName || "Direct Farm Batch"}</div></div>
      <div class="field"><div class="label">Payment Method</div><div class="val">${receipt.paymentMethod}</div></div>
    </div>
    <div>
      <div class="field"><div class="label">Audited By</div><div class="val">${receipt.recordedBy || "Farm Management"}</div></div>
      <div class="field"><div class="label">Investment Partner</div><div class="val">${partnerName}</div></div>
      <div class="field"><div class="label">Approval Status</div><div class="val" style="color:#15803d">Approved &amp; Reconciled</div></div>
    </div>
  </div>
  <table>
    <thead><tr><th>Description</th><th style="text-align:center">Units / Qty</th><th style="text-align:right">Total Verified Amount</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>${receipt.description}</strong><br><span style="font-size:11px;color:#666">Verified revenue entry from commercial poultry offload</span></td>
        <td style="text-align:center;font-weight:700">${birdsQty}</td>
        <td style="text-align:right;font-weight:900;font-size:16px;color:#0F3D24">${formattedAmount}</td>
      </tr>
    </tbody>
  </table>
  <div class="amount-box">
    <div class="amount-row">
      <span style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase">Net Total Received</span>
      <span class="amount-total">${formattedAmount}</span>
    </div>
  </div>
  <div class="footer">
    This document serves as verifiable electronic proof of farm revenue deposited to Dignity Agro Farms account.<br>
    Dignity Agro Farms Limited · dignityagrofarms.com · 08167099492
  </div>
</div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  const refCode = receipt.referenceNo || `DAF-SLS-${receipt.id.slice(0, 8).toUpperCase()}`;
  const birdsQty = receipt.birdsSold ? `${receipt.birdsSold} birds` : "Direct Farm Sales";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-[#0F3D24]/10 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <X size={18} />
        </button>

        {/* Official Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#0F3D24]/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-[#0F3D24] p-2 text-white">
                <Receipt size={20} />
              </span>
              <div>
                <h3 className="text-lg font-black text-[#0F3D24] leading-tight">
                  Dignity Agro Farms
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F8F3F]">
                  Official Farm Sales Receipt
                </span>
              </div>
            </div>
          </div>
          <div className="text-right pr-8">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-extrabold text-emerald-800">
              <ShieldCheck size={12} className="text-emerald-600" /> Verified Audit Voucher
            </span>
          </div>
        </div>

        {/* Voucher Info Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7F5F0] p-4 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Receipt Reference
            </span>
            <p className="mt-0.5 font-mono font-bold text-[#0F3D24]">{refCode}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Transaction Date
            </span>
            <p className="mt-0.5 font-bold text-[#0F3D24]">{receipt.transactionDate}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Pen Batch
            </span>
            <p className="mt-0.5 font-bold text-[#0F3D24]">{batchName || "Direct Farm Batch"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0F3D24]/60">
              Payment Method
            </span>
            <p className="mt-0.5 font-bold text-[#0F3D24]">{receipt.paymentMethod}</p>
          </div>
        </div>

        {/* Item Details */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="bg-[#0F3D24] px-4 py-2.5 text-white flex justify-between text-xs font-bold uppercase tracking-wider">
            <span>Item Description</span>
            <span>Quantity</span>
          </div>
          <div className="p-4 bg-white flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-[#0F3D24] text-sm">{receipt.description}</p>
              <span className="text-[11px] text-[#0F3D24]/60">{receipt.category}</span>
            </div>
            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {birdsQty}
            </span>
          </div>
          <div className="border-t border-slate-100 bg-[#F7F5F0]/60 p-4 flex justify-between items-baseline">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]/70">
              Total Amount Verified
            </span>
            <span className="text-2xl font-black text-emerald-700 tabular-nums">
              +₦{Number(receipt.amount).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Audit Details */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-[#0F3D24]/10">
          <span>Recorded by: <strong>{receipt.recordedBy || "Farm Management"}</strong></span>
          <span>Status: <strong className="text-emerald-700">Approved &amp; Reconciled</strong></span>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-extrabold text-white hover:bg-[#134a2c] shadow-sm transition cursor-pointer"
          >
            <Printer size={14} /> Print / Save Voucher
          </button>
        </div>
      </div>
    </div>
  );
}

