import { useState, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  ShieldCheck,
  ChevronDown,
  Banknote,
  CheckCircle2,
  Clock,
  History,
  Info,
  FileText,
  FileCheck2,
  Upload,
  ExternalLink,
  Loader2,
  X,
  AlertCircle,
  Award,
  Printer,
  RefreshCw,
  Building2,
  Copy,
  Check,
  Scale,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import type {
  FarmPartner,
  PartnerFinancial,
  PartnerDashboardSummary,
  PartnerPayoutElection,
} from "@/lib/partners.functions";
import {
  partnerSignAgreement,
  partnerUploadWrittenAgreement,
  adminUploadPartnerDocument,
  partnerSubmitCycleElection,
} from "@/lib/partners.functions";
import { useServerFn } from "@tanstack/react-start";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + naira(Math.abs(n));
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── Cycle Switcher Bar (Per-Partner Multi-Cycle Navigation) ──────────────────

export function CycleSwitcherBar({
  partner,
  selectedCycleId,
  onSelectCycle,
  onOpenRolloverModal,
  canRollover = false,
}: {
  partner: FarmPartner;
  selectedCycleId: string; // "current" or archive cycleId
  onSelectCycle: (cycleId: string) => void;
  onOpenRolloverModal?: () => void;
  canRollover?: boolean;
}) {
  const archives = partner.archivedCycles || [];
  if (archives.length === 0 && !canRollover) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#0F3D24]/10 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
          <Layers size={14} className="text-[#0F3D24]" /> Investment Cycles:
        </span>

        <button
          type="button"
          onClick={() => onSelectCycle("current")}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
            selectedCycleId === "current"
              ? "bg-[#0F3D24] text-white shadow-sm"
              : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-[#0F3D24]/10"
          }`}
        >
          <span>{partner.cycleName}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
              selectedCycleId === "current"
                ? "bg-white/20 text-white"
                : partner.cycleStatus === "closed"
                  ? "bg-slate-200 text-slate-700"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {partner.cycleStatus === "closed" ? "Settled" : "Active"}
          </span>
        </button>

        {archives.map((arc) => {
          const active = selectedCycleId === arc.cycleId;
          return (
            <button
              key={arc.cycleId}
              type="button"
              onClick={() => onSelectCycle(arc.cycleId)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? "bg-[#0F3D24] text-white shadow-sm"
                  : "bg-[#F7F5F0] text-slate-700 hover:bg-slate-200/70"
              }`}
            >
              <span>{arc.cycleName}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                  active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}
              >
                Archived
              </span>
            </button>
          );
        })}
      </div>

      {canRollover && onOpenRolloverModal && selectedCycleId === "current" && (
        <button
          type="button"
          onClick={onOpenRolloverModal}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/20 bg-[#F7F5F0] px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white transition"
        >
          <RefreshCw size={13} /> Start New Cycle / Rollover
        </button>
      )}
    </div>
  );
}

// ─── Biological & Unit-Economics KPI Strip ────────────────────────────────────

export function UnitEconomicsStrip({
  partner,
  summary,
}: {
  partner: FarmPartner;
  summary: PartnerDashboardSummary;
}) {
  // Compute cycle timeline progress
  const startMs = partner.cycleStartDate ? new Date(partner.cycleStartDate).getTime() : null;
  const endMs = partner.cycleEndDate ? new Date(partner.cycleEndDate).getTime() : null;
  const refNow =
    partner.cycleStatus === "closed" && partner.settledAt
      ? new Date(partner.settledAt).getTime()
      : Date.now();

  let elapsedDays = 0;
  let totalDays: number | null = null;
  let progressPct = 0;

  if (startMs && !Number.isNaN(startMs)) {
    elapsedDays = Math.max(1, Math.ceil((refNow - startMs) / 86_400_000));
    if (endMs && !Number.isNaN(endMs) && endMs > startMs) {
      totalDays = Math.max(1, Math.ceil((endMs - startMs) / 86_400_000));
      progressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
    }
  }

  const fcrStatus =
    summary.fcr === null
      ? null
      : summary.fcr <= 1.65
        ? { label: "Optimal Efficiency", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" }
        : summary.fcr <= 1.95
          ? { label: "Standard Range", tone: "bg-amber-50 text-amber-800 border-amber-200" }
          : { label: "High Feed Intake", tone: "bg-rose-50 text-rose-800 border-rose-200" };

  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm space-y-4">
      {/* Top Row: Cycle Timeline Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F3D24]/5 text-[#0F3D24]">
            <Calendar size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]">
                Cycle Lifecycle & Unit Economics
              </span>
              <span className="rounded-md bg-[#F7F5F0] px-2 py-0.5 text-[11px] font-bold text-[#0F3D24] tabular-nums">
                {totalDays
                  ? `Day ${Math.min(elapsedDays, totalDays)} of ${totalDays} (${progressPct}%)`
                  : elapsedDays > 0
                    ? `Day ${elapsedDays} Active`
                    : partner.cycleName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {fmtDate(partner.cycleStartDate)} &rarr;{" "}
              {partner.cycleEndDate ? fmtDate(partner.cycleEndDate) : "Open Harvest Window"}
            </p>
          </div>
        </div>

        {totalDays && (
          <div className="w-full sm:w-56">
            <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1 tabular-nums">
              <span>Start</span>
              <span>
                {partner.cycleStatus === "closed"
                  ? "Cycle Settled"
                  : Math.max(0, totalDays - elapsedDays) === 0
                    ? "Harvest Window Reached"
                    : `${Math.max(0, totalDays - elapsedDays)}d to target`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#0F3D24] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Row: 4 Unit-Economic Pillars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-[#FAF9F6] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Production Cost / Bird
          </div>
          <div className="mt-1 text-lg font-black text-[#0F3D24] tabular-nums">
            {summary.costPerLiveBird !== null ? naira(summary.costPerLiveBird) : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {summary.currentStockCount > 0
              ? `Across ${summary.currentStockCount.toLocaleString()} live birds`
              : "Awaiting stock headcount log"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-[#FAF9F6] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Break-Even Price / Bird
          </div>
          <div className="mt-1 text-lg font-black text-[#0F3D24] tabular-nums">
            {summary.breakEvenPricePerBird !== null
              ? summary.breakEvenPricePerBird === 0
                ? "Recovered"
                : naira(summary.breakEvenPricePerBird)
              : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {summary.breakEvenPricePerBird === 0
              ? "Sales have covered 100% of outlay"
              : "Min. sale price per bird for ₦0 loss"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-[#FAF9F6] p-3.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Feed Conversion (FCR)
            </span>
            {fcrStatus && (
              <span className={`rounded border px-1.5 py-0.2 text-[9px] font-bold ${fcrStatus.tone}`}>
                {fcrStatus.label}
              </span>
            )}
          </div>
          <div className="mt-1 text-lg font-black text-[#0F3D24] tabular-nums">
            {summary.fcr !== null ? `${summary.fcr.toFixed(2)} : 1` : "—"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {summary.estimatedBiomassKg > 0
              ? `${summary.totalFeedConsumedKg.toLocaleString()} kg feed / ${summary.estimatedBiomassKg.toLocaleString()} kg flock`
              : "Requires feed + weight check logs"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-[#FAF9F6] p-3.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Flock Survival & Weight
          </div>
          <div className="mt-1 text-lg font-black text-[#0F3D24] tabular-nums">
            {summary.initialStockCount > 0
              ? `${(100 - summary.mortalityRatePercent).toFixed(1)}%`
              : "—"}
            {summary.latestAverageWeightKg > 0 && (
              <span className="ml-2 text-xs font-bold text-[#3F8F3F]">
                · {summary.latestAverageWeightKg} kg avg
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {summary.initialStockCount > 0
              ? `${summary.currentStockCount.toLocaleString()} of ${summary.initialStockCount.toLocaleString()} stocked (${summary.totalMortalityCount} mortality)`
              : "No stock intake logged yet"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Terms banner ─────────────────────────────────────────────────────────────

export function TermsBanner({
  partner,
  onOpenAgreement,
  onOpenCertificate,
}: {
  partner: FarmPartner;
  onOpenAgreement?: () => void;
  onOpenCertificate?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#0F3D24]/15 bg-[#FAF9F6] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#0F3D24]" size={20} />
        <div className="space-y-2 text-xs flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-extrabold uppercase tracking-wider text-[#0F3D24]">
              Partnership Governance & Terms
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                  partner.agreementSigned
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                {partner.agreementSigned ? (
                  <>
                    <FileCheck2 size={11} /> Digitally Signed
                  </>
                ) : (
                  <>
                    <AlertCircle size={11} /> Pending Signature
                  </>
                )}
              </span>

              {partner.agreementSigned && onOpenCertificate && (
                <button
                  type="button"
                  onClick={onOpenCertificate}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0F3D24] px-3 py-0.5 text-[10px] font-bold text-white hover:bg-[#165232] transition"
                >
                  <Award size={11} /> Partnership Certificate
                </button>
              )}

              {onOpenAgreement && (
                <button
                  type="button"
                  onClick={onOpenAgreement}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#0F3D24] border border-[#0F3D24]/15 hover:bg-[#0F3D24] hover:text-white transition"
                >
                  Review Contract &rarr;
                </button>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-[#0F3D24]">
            Committed Capital: <strong className="tabular-nums">{naira(partner.initialInvestment)}</strong> · You
            receive <strong className="text-emerald-700">{partner.profitSharePercentage}% of net profit</strong> and
            bear <strong className="text-rose-700">{partner.lossSharePercentage}% of net loss</strong>{" "}
            <span className="font-normal text-slate-600">(strictly capped at your committed capital).</span>
          </p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <span>
              Cycle: <strong className="text-[#0F3D24]">{partner.cycleName}</strong>
            </span>
            <span>
              Window: {fmtDate(partner.cycleStartDate)} &rarr; {fmtDate(partner.cycleEndDate)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                partner.cycleStatus === "closed"
                  ? "bg-slate-800 text-white"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200"
              }`}
            >
              {partner.cycleStatus === "closed" ? (
                <>
                  <Lock size={10} /> Settled {fmtDate(partner.settledAt)}
                </>
              ) : (
                "Active Cycle"
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Result hero ──────────────────────────────────────────────────────────────

export function ResultHero({ partner }: { partner: FarmPartner }) {
  const s = partner.settlement;
  const isProfit = s.result === "profit";
  const isLoss = s.result === "loss";
  const projected = partner.cycleStatus === "open";

  const tone = isLoss
    ? "bg-[#7F1D1D] border-rose-900"
    : isProfit
      ? "bg-[#0F3D24] border-[#0F3D24]"
      : "bg-slate-800 border-slate-700";
  const Icon = isLoss ? TrendingDown : isProfit ? TrendingUp : Minus;

  return (
    <div className={`rounded-2xl border ${tone} p-6 sm:p-7 text-white shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <Icon size={16} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/75">
              {projected ? "Live Operational Position (Cycle Open)" : "Final Certified Settlement (Cycle Closed)"}
            </span>
          </div>
          <div className="mt-3 text-3xl font-black tracking-tight sm:text-4xl tabular-nums">
            {isLoss ? "Net Loss Share: " : isProfit ? "Net Profit Share: " : "Break-Even Position "}
            {s.result !== "breakeven" && signed(s.partnerSignedResult)}
          </div>
          <div className="mt-1 text-xs sm:text-sm font-medium text-white/85">
            {isProfit &&
              `Your ${partner.profitSharePercentage}% allocation of ${naira(s.net)} net operational profit`}
            {isLoss &&
              `Your ${partner.lossSharePercentage}% allocation of ${naira(Math.abs(s.net))} net operational deficit`}
            {!isProfit && !isLoss && "Revenue currently matches operational expenditure (100% capital intact)"}
          </div>
        </div>

        <div className="rounded-xl border border-white/15 bg-white/10 px-5 py-3.5 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            Total Partner Entitlement
          </div>
          <div className="mt-0.5 text-2xl font-black tabular-nums">{naira(s.payoutDue)}</div>
          <div className="text-[11px] text-white/70">
            Principal {isLoss ? "less allocated loss" : "plus allocated profit"}
          </div>
        </div>
      </div>
      {s.lossWasCapped && (
        <p className="mt-4 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium">
          Capital Loss Cap Active: Your liability is strictly limited to your initial capital ({naira(partner.initialInvestment)}). Dignity Agro Farms absorbs the excess deficit.
        </p>
      )}
    </div>
  );
}

// ─── Step-by-step breakdown ───────────────────────────────────────────────────

export function SettlementBreakdown({ partner }: { partner: FarmPartner }) {
  const s = partner.settlement;
  const isLoss = s.result === "loss";

  const rows: { label: string; value: string; tone?: string; strong?: boolean; note?: string }[] = [
    { label: "Gross Bird Sales & Offload Revenue", value: naira(s.totalIncome), tone: "text-emerald-700" },
    { label: "Total Verified Cycle Expenditure", value: "-" + naira(s.totalExpenses), tone: "text-rose-700" },
    {
      label: s.net >= 0 ? "Net Cycle Operational Profit" : "Net Cycle Operational Deficit",
      value: signed(s.net),
      tone: s.net >= 0 ? "text-emerald-700" : "text-rose-700",
      strong: true,
    },
    {
      label: isLoss
        ? `Partner Allocated Loss (${partner.lossSharePercentage}%)`
        : `Partner Allocated Profit (${partner.profitSharePercentage}%)`,
      value: signed(s.partnerSignedResult),
      tone: isLoss ? "text-rose-700" : "text-emerald-700",
      note: s.lossWasCapped ? "Capped at capital" : undefined,
    },
    {
      label: isLoss ? "Farm Absorbed Loss Share" : `Farm Retained Profit Share (${100 - partner.profitSharePercentage}%)`,
      value: naira(s.farmShareAmount),
      tone: "text-slate-700",
    },
    { label: "Initial Committed Capital", value: naira(partner.initialInvestment) },
    {
      label: "Total Settlement Entitlement (Capital " + (isLoss ? "\u2212" : "+") + " Share)",
      value: naira(s.payoutDue),
      strong: true,
      tone: "text-[#0F3D24]",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-black text-[#0F3D24]">Reconciliation & Settlement Statement</h4>
      <p className="mb-3 text-[11px] text-slate-500">
        {partner.cycleStatus === "open"
          ? "Live reconciliation based on verified ledger entries."
          : "Certified final figures locked at cycle closure."}
      </p>
      <ul className="divide-y divide-slate-100 text-xs sm:text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
            <span className={`${r.strong ? "font-bold text-[#0F3D24]" : "text-slate-600"}`}>
              {r.label}
              {r.note && (
                <span className="ml-2 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  {r.note}
                </span>
              )}
            </span>
            <span className={`shrink-0 font-black tabular-nums ${r.tone || "text-slate-800"}`}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Payout tracker ───────────────────────────────────────────────────────────

export function PayoutTracker({
  partner,
  financials,
}: {
  partner: FarmPartner;
  financials: PartnerFinancial[];
}) {
  const s = partner.settlement;
  const payouts = financials
    .filter((f) => f.type === "payout" && !f.removedAt && f.approvalStatus === "approved")
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
  const settled = s.balanceOwed <= 0.01 && s.payoutDue > 0;

  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-black text-[#0F3D24]">
          <Banknote size={16} className="text-[#0F3D24]" /> Disbursement & Payout Tracker
        </h4>
        {settled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
            <CheckCircle2 size={11} /> Fully Disbursed
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-end justify-between text-xs tabular-nums">
          <span className="font-bold text-[#0F3D24]">{s.payoutProgressPercent}% disbursed</span>
          <span className="text-slate-500">of {naira(s.payoutDue)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#0F3D24] transition-all duration-700"
            style={{ width: `${s.payoutProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center tabular-nums">
        <div className="rounded-xl border border-slate-200/70 bg-[#FAF9F6] p-3">
          <div className="text-[10px] font-bold uppercase text-slate-500">Total Due</div>
          <div className="mt-0.5 text-sm font-black text-[#0F3D24]">{naira(s.payoutDue)}</div>
        </div>
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3">
          <div className="text-[10px] font-bold uppercase text-emerald-700">Disbursed</div>
          <div className="mt-0.5 text-sm font-black text-emerald-900">{naira(s.paidOut)}</div>
        </div>
        <div
          className={`rounded-xl border p-3 ${
            s.balanceOwed > 0.01
              ? "border-amber-200/80 bg-amber-50/50"
              : "border-slate-200/70 bg-slate-50"
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase ${
              s.balanceOwed > 0.01 ? "text-amber-800" : "text-slate-500"
            }`}
          >
            Balance
          </div>
          <div
            className={`mt-0.5 text-sm font-black ${
              s.balanceOwed > 0.01 ? "text-amber-950" : "text-slate-700"
            }`}
          >
            {naira(Math.max(0, s.balanceOwed))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Clock size={12} /> Recorded Disbursements
        </div>
        {payouts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
            No payout transfers have been recorded for this cycle yet.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-[#0F3D24]/25 pl-4">
            {payouts.map((p) => (
              <li key={p.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0F3D24] ring-4 ring-white" />
                <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                  <span className="font-bold text-[#0F3D24]">{naira(p.amount)}</span>
                  <span className="text-slate-500">{fmtDate(p.transactionDate)}</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {p.description} · {p.paymentMethod}
                  {p.referenceNo && <span className="font-mono"> · Ref {p.referenceNo}</span>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ─── Partner Maturity Election Card (Bank Payout vs. Cycle Rollover) ──────────

export function CycleElectionCard({
  partner,
  token,
  isAdminView = false,
  onElectionUpdated,
  onTriggerAdminRollover,
}: {
  partner: FarmPartner;
  token?: string;
  isAdminView?: boolean;
  onElectionUpdated?: (election: PartnerPayoutElection) => void;
  onTriggerAdminRollover?: () => void;
}) {
  const existing = partner.payoutElection;
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<"bank_payout" | "rollover_principal" | "rollover_all">(
    existing?.choice || "bank_payout",
  );
  const [bankName, setBankName] = useState(existing?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber || "");
  const [accountName, setAccountName] = useState(existing?.accountName || partner.fullName || "");
  const [notes, setNotes] = useState(existing?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [copiedBank, setCopiedBank] = useState(false);

  const submitElectionFn = useServerFn(partnerSubmitCycleElection);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setErrMsg("");
    try {
      const res = await submitElectionFn({
        data: {
          token,
          choice,
          bankName: choice === "bank_payout" ? bankName : null,
          accountNumber: choice === "bank_payout" ? accountNumber : null,
          accountName: choice === "bank_payout" ? accountName : null,
          notes: notes || null,
        },
      });
      setEditing(false);
      if (onElectionUpdated) onElectionUpdated(res.election);
    } catch (err: any) {
      setErrMsg(err instanceof Error ? err.message : "Could not save maturity instruction.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyBankDetails = () => {
    if (!existing) return;
    const text = `${existing.bankName || ""} - ${existing.accountNumber || ""} (${existing.accountName || ""})`;
    navigator.clipboard.writeText(text);
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const labelForChoice = (c: PartnerPayoutElection["choice"]) =>
    c === "bank_payout"
      ? "Direct Bank Payout Disbursement"
      : c === "rollover_principal"
        ? "Rollover Principal Only (Disburse Profit)"
        : "Compound & Rollover Full Entitlement (Principal + Profit)";

  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D24]/5 text-[#0F3D24]">
            <Building2 size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#0F3D24]">
              Cycle Maturity & Settlement Instruction
            </h4>
            <p className="text-[11px] text-slate-500">
              {isAdminView
                ? "Partner's submitted preference for cycle settlement or capital rollover."
                : "Specify whether to receive a direct bank payout or rollover capital into the next cycle."}
            </p>
          </div>
        </div>

        {existing && !editing && token && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-[#FAF9F6] transition"
          >
            Update Instruction
          </button>
        )}
      </div>

      {/* Existing Election Display */}
      {existing && !editing ? (
        <div className="rounded-xl border border-[#0F3D24]/15 bg-[#FAF9F6] p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-black text-[#0F3D24] text-sm">
              <CheckCircle2 size={15} className="text-emerald-700" />
              {labelForChoice(existing.choice)}
            </span>
            <span className="text-[11px] text-slate-500">
              Submitted {fmtDate(existing.submittedAt)}
            </span>
          </div>

          {existing.choice === "bank_payout" && existing.accountNumber && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Designated Receiving Bank Account
                </div>
                <div className="mt-0.5 font-bold text-[#0F3D24]">
                  {existing.bankName} · <span className="font-mono">{existing.accountNumber}</span>
                </div>
                <div className="text-[11px] text-slate-600">{existing.accountName}</div>
              </div>
              <button
                type="button"
                onClick={copyBankDetails}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                {copiedBank ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copiedBank ? "Copied" : "Copy Account"}
              </button>
            </div>
          )}

          {existing.notes && (
            <p className="text-slate-600 italic">Note: &ldquo;{existing.notes}&rdquo;</p>
          )}

          {isAdminView &&
            (existing.choice === "rollover_principal" || existing.choice === "rollover_all") &&
            onTriggerAdminRollover && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onTriggerAdminRollover}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white hover:bg-[#165232] transition"
                >
                  <RefreshCw size={13} /> Execute Cycle Rollover Now
                </button>
              </div>
            )}
        </div>
      ) : isAdminView ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
          The partner has not submitted a payout or rollover instruction for{" "}
          <strong>{partner.cycleName}</strong> yet.
        </div>
      ) : (
        /* Partner Election Form */
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {errMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-700">
              {errMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  id: "bank_payout",
                  title: "Direct Bank Payout",
                  desc: `Disburse ${naira(partner.settlement.payoutDue)} to my bank`,
                },
                {
                  id: "rollover_principal",
                  title: "Rollover Principal",
                  desc: `Reinvest ${naira(partner.initialInvestment)}, payout profit`,
                },
                {
                  id: "rollover_all",
                  title: "Compound & Rollover All",
                  desc: `Reinvest full ${naira(partner.settlement.payoutDue)} in next cycle`,
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChoice(opt.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  choice === opt.id
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 ring-1 ring-[#0F3D24]"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-[#0F3D24]">{opt.title}</div>
                <div className="mt-1 text-[11px] text-slate-500 tabular-nums">{opt.desc}</div>
              </button>
            ))}
          </div>

          {choice === "bank_payout" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-[#FAF9F6] p-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#0F3D24] mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zenith Bank / GTBank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0F3D24] mb-1">
                  Account Number (NUBAN) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  placeholder="10-digit account no."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0F3D24] mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full account beneficiary name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-[#0F3D24] mb-1">
              Additional Settlement Note (Optional)
            </label>
            <input
              type="text"
              placeholder="Any specific instruction for Farm Management..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-[#FAF9F6] px-3 py-2 text-xs text-[#0F3D24] outline-none focus:border-[#0F3D24]"
            />
          </div>

          <div className="flex justify-end gap-2">
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {submitting ? "Saving..." : "Submit Settlement Instruction"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── How this is calculated ───────────────────────────────────────────────────

export function HowCalculated({ partner }: { partner: FarmPartner }) {
  const [open, setOpen] = useState(false);
  const p = partner.profitSharePercentage;
  const l = partner.lossSharePercentage;
  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-black text-[#0F3D24]">
          <Scale size={16} className="text-[#0F3D24]" /> Methodology: How Profit & Loss Partitioning Works
        </span>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-700">
          <p>
            <strong>1. Operational Net Result</strong> = Total Verified Bird Sales &minus; Total Verified Cycle Expenses. Every expense and sale is itemized in the ledger.
          </p>
          <p>
            <strong>2. Profit Allocation</strong>: When the cycle yields a net profit, you receive <strong>{p}%</strong> of the net profit, and Dignity Agro Farms retains <strong>{100 - p}%</strong>.
          </p>
          <p>
            <strong>3. Loss Responsibility & Capital Cap</strong>: If the cycle incurs a net deficit, your agreed share is <strong>{l}%</strong> of the deficit, <strong>strictly capped at your committed capital ({naira(partner.initialInvestment)})</strong>. You never bear negative liability or debt beyond your capital.
          </p>
          <p>
            <strong>4. Total Settlement Entitlement</strong> = Your initial capital adjusted for your net share (Capital + Profit or &minus; Loss).
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Audit timeline ───────────────────────────────────────────────────────────

export function AuditTimeline({ partner }: { partner: FarmPartner }) {
  if (partner.auditLog.length === 0) return null;
  const label = (k: string) =>
    k === "terms_amended"
      ? "Partnership terms amended"
      : k === "cycle_closed"
        ? "Cycle closed & certified"
        : k === "agreement_signed"
          ? "Terms & Conditions digitally signed"
          : k === "cycle_rollover"
            ? "Cycle rolled over to new cycle"
            : k === "payout_election"
              ? "Settlement / rollover preference recorded"
              : "Cycle re-opened";

  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-5 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F3D24]">
        <History size={16} className="text-[#0F3D24]" /> Governance & Audit Log
      </h4>
      <ol className="space-y-2.5 text-xs">
        {[...partner.auditLog].reverse().map((e, i) => (
          <li key={i} className="rounded-xl border border-slate-200/70 bg-[#FAF9F6] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0F3D24]">{label(e.kind)}</span>
              <span className="text-slate-500 tabular-nums">{fmtDate(e.at)}</span>
            </div>
            {e.from && e.to && (
              <div className="mt-1 text-slate-700 tabular-nums">
                Profit share {e.from.profit}% &rarr; <strong>{e.to.profit}%</strong> · Loss share {e.from.loss}% &rarr;{" "}
                <strong>{e.to.loss}%</strong>
              </div>
            )}
            {e.reason && <div className="mt-1 text-slate-600">{e.reason}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Agreement Card & Digital Signing ─────────────────────────────────────────

export function AgreementCard({
  partner,
  onOpenSignModal,
  onOpenUploadModal,
  onOpenCertificate,
}: {
  partner: FarmPartner;
  onOpenSignModal: () => void;
  onOpenUploadModal: () => void;
  onOpenCertificate?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3D24]/5 text-[#0F3D24]">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-[#0F3D24]">Partnership Contract & Documentation</h3>
            <p className="text-xs text-slate-500">
              Executed legal agreement governing capital commitment, profit/loss split, and cycle terms.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
              partner.agreementSigned
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {partner.agreementSigned ? (
              <>
                <FileCheck2 size={13} /> Digitally Signed & Certified
              </>
            ) : (
              <>
                <AlertCircle size={13} /> Signature Required
              </>
            )}
          </span>

          {partner.agreementSigned && onOpenCertificate && (
            <button
              type="button"
              onClick={onOpenCertificate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#165232] transition"
            >
              <Award size={13} /> View Certificate
            </button>
          )}
        </div>
      </div>

      {/* Signature Banner / Summary */}
      {partner.agreementSigned ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={15} className="text-emerald-700" />
              Electronic Execution Recorded
            </div>
            <p className="text-emerald-900">
              Digitally executed by <strong>{partner.agreementSignedBy || partner.fullName}</strong> on{" "}
              <strong>{fmtDate(partner.agreementSignedAt)}</strong>.
            </p>
          </div>
          {onOpenCertificate && (
            <button
              type="button"
              onClick={onOpenCertificate}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-emerald-50 transition"
            >
              Print Official Certificate &rarr;
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-bold text-amber-950">Action Required: Execute Your Partnership Agreement</div>
            <p className="text-amber-800">
              Please review the formal terms and sign electronically to certify your cycle agreement.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSignModal}
            className="rounded-xl bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white hover:bg-[#165232] transition whitespace-nowrap"
          >
            Read & Sign Terms &rarr;
          </button>
        </div>
      )}

      {/* Attached Written Agreement (if uploaded) */}
      {partner.agreementDocumentUrl ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 text-xs">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[#0F3D24]" />
            <div>
              <span className="font-bold text-[#0F3D24] block">
                {partner.agreementDocumentName || "Written Partnership Agreement"}
              </span>
              <span className="text-[11px] text-slate-500">
                Uploaded by {partner.agreementDocumentUploadedBy || "Management"} •{" "}
                {fmtDate(partner.agreementDocumentUploadedAt)}
                {partner.agreementDocumentSize && ` • ${partner.agreementDocumentSize}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={partner.agreementDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] border border-[#0F3D24]/15 hover:bg-[#0F3D24] hover:text-white transition"
            >
              <ExternalLink size={12} /> Open Document
            </a>
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="rounded-xl bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-xs">
          <span className="text-slate-500">
            Have a physically signed paper contract or stamped PDF? Attach it here for permanent archival.
          </span>
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] border border-[#0F3D24]/20 hover:bg-[#FAF9F6] transition"
          >
            <Upload size={12} /> Attach Scanned Contract
          </button>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onOpenSignModal}
          className="text-xs font-bold text-[#0F3D24] hover:underline flex items-center gap-1"
        >
          <FileText size={13} /> {partner.agreementSigned ? "Read Full Contract Clauses" : "Review Contract Clauses"}
        </button>
      </div>
    </div>
  );
}

// ─── Digital Certificate of Partnership Modal ────────────────────────────────

export function PartnershipCertificateModal({
  partner,
  onClose,
}: {
  partner: FarmPartner;
  onClose: () => void;
}) {
  const certRef = `DAF-CERT-${partner.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white p-4 sm:p-6 shadow-2xl">
        {/* Top Action Bar (Hidden on print) */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F3D24]">
            <Award size={16} /> Official Certificate of Agricultural Partnership
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#165232] transition"
            >
              <Printer size={13} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Frame */}
        <div className="rounded-xl border-4 border-double border-[#0F3D24]/35 bg-[#FAF9F5] p-6 sm:p-10 text-[#0F3D24]">
          <div className="text-center border-b border-[#0F3D24]/15 pb-6">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#3F8F3F]">
              Dignity Agro Farms Limited · Owerri, Imo State
            </div>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl font-black tracking-tight text-[#0F3D24]">
              CERTIFICATE OF AGRICULTURAL PARTNERSHIP
            </h2>
            <div className="mt-1 text-xs font-mono text-slate-500">
              Certificate No: {certRef} · Cycle: {partner.cycleName}
            </div>
          </div>

          <div className="my-6 space-y-4 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              This certifies that
            </p>
            <div className="text-2xl sm:text-3xl font-black text-[#0F3D24] border-b border-[#0F3D24]/20 inline-block px-8 pb-1">
              {partner.fullName}
            </div>
            <p className="mx-auto max-w-xl text-xs sm:text-sm leading-relaxed text-slate-700">
              is a verified Co-Financing Partner in <strong>{partner.projectName}</strong> ({partner.cycleName}) with{" "}
              <strong>Dignity Agro Farms Limited</strong>, under the following registered governance terms:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-center">
            <div className="rounded-xl border border-[#0F3D24]/15 bg-white p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Committed Capital</div>
              <div className="mt-1 text-sm font-black text-[#0F3D24] tabular-nums">
                {naira(partner.initialInvestment)}
              </div>
            </div>
            <div className="rounded-xl border border-[#0F3D24]/15 bg-white p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Partner Profit Share</div>
              <div className="mt-1 text-sm font-black text-emerald-700 tabular-nums">
                {partner.profitSharePercentage}% of Net
              </div>
            </div>
            <div className="rounded-xl border border-[#0F3D24]/15 bg-white p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Loss Responsibility</div>
              <div className="mt-1 text-sm font-black text-rose-700 tabular-nums">
                {partner.lossSharePercentage}% (Capped)
              </div>
            </div>
            <div className="rounded-xl border border-[#0F3D24]/15 bg-white p-3">
              <div className="text-[10px] font-bold uppercase text-slate-500">Cycle Window</div>
              <div className="mt-1 text-xs font-bold text-[#0F3D24]">
                {fmtDate(partner.cycleStartDate)}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-[#0F3D24]/15 pt-6 text-xs">
            <div>
              <div className="font-serif italic text-base font-bold text-[#0F3D24]">
                {partner.agreementSignedBy || partner.fullName}
              </div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500">
                Digitally Signed by Partner · {fmtDate(partner.agreementSignedAt)}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-[#0F3D24]/20 bg-[#0F3D24]/5 px-4 py-2 text-[11px] font-bold text-[#0F3D24]">
              <ShieldCheck size={16} className="text-[#3F8F3F]" />
              Verified Digital Seal · {certRef}
            </div>

            <div className="text-right">
              <div className="font-serif italic text-base font-bold text-[#0F3D24]">
                Dignity Agro Farms Ltd.
              </div>
              <div className="border-t border-slate-300 pt-1 text-[11px] text-slate-500">
                Authorized Farm Management
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Evidence / Receipt / Pen Photo Lightbox Modal ────────────────────────────

export function EvidenceLightboxModal({
  url,
  title,
  subtitle,
  onClose,
}: {
  url: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const isPdf = url.startsWith("data:application/pdf") || url.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div>
            <h4 className="text-sm font-black text-[#0F3D24]">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={title.replace(/\s+/g, "_")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-slate-50"
            >
              <ArrowUpRight size={13} /> Open Full
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900/95 p-4 flex items-center justify-center min-h-[320px]">
          {isPdf ? (
            <iframe src={url} title={title} className="h-[70vh] w-full rounded-lg bg-white" />
          ) : (
            <img
              src={url}
              alt={title}
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sign Agreement Modal ─────────────────────────────────────────────────────

export function SignAgreementModal({
  partner,
  token,
  onClose,
  onSigned,
}: {
  partner: FarmPartner;
  token?: string;
  onClose: () => void;
  onSigned?: (signedBy: string, signedAt: string) => void;
}) {
  const [legalName, setLegalName] = useState(partner.fullName || "");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const signFn = useServerFn(partnerSignAgreement);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Session missing. Please re-login.");
      return;
    }
    if (!legalName.trim()) {
      setErrorMsg("Please enter your full legal name to sign.");
      return;
    }
    if (!accepted) {
      setErrorMsg("Please check the box confirming you have read and agree to the terms.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await signFn({
        data: {
          token,
          legalName: legalName.trim(),
        },
      });
      if (onSigned) onSigned(res.signedBy, res.signedAt);
      onClose();
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to record signature.");
    } finally {
      setSubmitting(false);
    }
  };

  const termsText =
    partner.agreementTerms ||
    partner.agreedTerms ||
    `DIGNITY AGRO FARMS LIMITED\nPOULTRY CO-FINANCING & EQUITY PARTNERSHIP TERMS AND CONDITIONS\n\nParties: Dignity Agro Farms Limited & ${partner.fullName}\nProject: ${partner.projectName} (${partner.cycleName})\nCapital: ${naira(partner.initialInvestment)}\nProfit Share: ${partner.profitSharePercentage}% of Net Profit\nLoss Share: ${partner.lossSharePercentage}% of Net Loss (Capped at capital)\n\nFull terms apply as logged in the farm management portal.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D24] text-white">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0F3D24]">Partnership Terms & Conditions</h3>
              <p className="text-[11px] text-slate-500">Read and execute your formal partnership agreement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Terms Text */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
          <div className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text">
            {termsText}
          </div>

          {partner.agreementSigned && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={16} className="text-emerald-700" />
                This agreement was digitally signed on {fmtDate(partner.agreementSignedAt)}.
              </div>
              <p className="text-[11px]">
                Signer: <strong>{partner.agreementSignedBy || partner.fullName}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Signing Form (if unsigned and token provided) */}
        {!partner.agreementSigned && token && (
          <form onSubmit={handleSign} className="border-t border-slate-100 p-5 space-y-3 bg-slate-50 rounded-b-2xl text-xs">
            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">
                {errorMsg}
              </div>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#0F3D24] focus:ring-[#3F8F3F]"
              />
              <span className="text-slate-700 font-medium">
                I have read, understood, and accept all the Terms & Conditions of this partnership with Dignity Agro Farms.
              </span>
            </label>

            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">
                Type Your Full Legal Name as Electronic Signature:
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Chief Emeka N. Okafor"
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !accepted || !legalName.trim()}
                className="rounded-xl bg-[#0F3D24] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#165232] disabled:opacity-50 transition"
              >
                {submitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" /> Signing...
                  </span>
                ) : (
                  "Execute & Sign Agreement"
                )}
              </button>
            </div>
          </form>
        )}

        {partner.agreementSigned && (
          <div className="flex items-center justify-end border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#0F3D24] px-6 py-2 text-xs font-bold text-white hover:bg-[#165232]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upload Written Agreement Modal ──────────────────────────────────────────

export function UploadWrittenAgreementModal({
  partner,
  token,
  passcode,
  onClose,
  onSuccess,
}: {
  partner: FarmPartner;
  token?: string;
  passcode?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const partnerUploadFn = useServerFn(partnerUploadWrittenAgreement);
  const adminUploadFn = useServerFn(adminUploadPartnerDocument);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("File is larger than 8MB. Please choose a smaller PDF or image, or provide a document link.");
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");

    const reader = new FileReader();
    reader.onload = () => {
      setFileUrl(reader.result as string);
      setErrorMsg("");
    };
    reader.onerror = () => setErrorMsg("Could not read file. Please try another file.");
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl.trim() || !fileName.trim()) {
      setErrorMsg("Please select a file or enter a document link.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      if (passcode) {
        await adminUploadFn({
          data: {
            passcode,
            partnerId: partner.id,
            fileUrl: fileUrl.trim(),
            fileName: fileName.trim(),
            fileSize: fileSize || "Attachment",
          },
        });
      } else if (token) {
        await partnerUploadFn({
          data: {
            token,
            fileUrl: fileUrl.trim(),
            fileName: fileName.trim(),
            fileSize: fileSize || "Attachment",
          },
        });
      } else {
        setErrorMsg("Upload session unavailable.");
        setSubmitting(false);
        return;
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload document.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-[#0F3D24]/10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-[#0F3D24]" />
            <h3 className="text-base font-black text-[#0F3D24]">Attach Written Agreement</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">
              Select Signed Agreement File (PDF, PNG, JPG)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileChange}
              className="w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#0F3D24] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#165232] cursor-pointer"
            />
            {fileName && (
              <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                Selected: {fileName} {fileSize && `(${fileSize})`}
              </p>
            )}
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-2 text-[10px] uppercase font-bold text-slate-400">or paste document link</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">External Document URL (Google Drive / Cloud)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={fileUrl.startsWith("data:") ? "" : fileUrl}
              onChange={(e) => {
                setFileUrl(e.target.value);
                if (!fileName) setFileName("Written_Partnership_Agreement.pdf");
              }}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] p-2.5 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Document Label / Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Signed_Broiler_Partnership_Contract.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] p-2.5 text-[#0F3D24] font-medium outline-none focus:border-[#0F3D24]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !fileUrl.trim()}
              className="rounded-xl bg-[#0F3D24] px-5 py-2 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Uploading...
                </span>
              ) : (
                "Save Agreement Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
