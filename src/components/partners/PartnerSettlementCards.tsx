import { useState } from "react";
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
} from "lucide-react";
import type { FarmPartner, PartnerFinancial } from "@/lib/partners.functions";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + naira(Math.abs(n));
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── Terms banner ─────────────────────────────────────────────────────────────

export function TermsBanner({ partner }: { partner: FarmPartner }) {
  return (
    <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#3F8F3F]" size={20} />
        <div className="space-y-2 text-xs">
          <div className="font-extrabold uppercase tracking-wider text-[#0F3D24]">Your Partnership Terms</div>
          <p className="text-sm font-semibold text-[#0F3D24]">
            You invested <strong>{naira(partner.initialInvestment)}</strong>. You receive{" "}
            <strong className="text-emerald-700">{partner.profitSharePercentage}% of profit</strong> and bear{" "}
            <strong className="text-rose-700">{partner.lossSharePercentage}% of loss</strong>{" "}
            <span className="font-medium text-slate-600">(never more than your capital).</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <span>
              Cycle: <strong className="text-[#0F3D24]">{partner.cycleName}</strong>
            </span>
            <span>
              {fmtDate(partner.cycleStartDate)} → {fmtDate(partner.cycleEndDate)}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                partner.cycleStatus === "closed" ? "bg-slate-800 text-white" : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {partner.cycleStatus === "closed" ? (
                <>
                  <Lock size={10} /> Settled {fmtDate(partner.settledAt)}
                </>
              ) : (
                "Cycle open"
              )}
            </span>
          </div>
          {partner.agreedTerms && (
            <p className="whitespace-pre-wrap border-t border-[#3F8F3F]/20 pt-2 text-slate-700">{partner.agreedTerms}</p>
          )}
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
    ? "from-rose-700 via-rose-600 to-rose-800"
    : isProfit
      ? "from-[#0F3D24] via-[#165232] to-[#0F3D24]"
      : "from-slate-700 via-slate-600 to-slate-800";
  const Icon = isLoss ? TrendingDown : isProfit ? TrendingUp : Minus;

  return (
    <div className={`rounded-3xl bg-gradient-to-r ${tone} p-6 sm:p-8 text-white shadow-lg`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <Icon size={18} />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">
              {projected ? "Projected result (cycle open)" : "Final result (settled)"}
            </span>
          </div>
          <div className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            {isLoss ? "Loss " : isProfit ? "Profit " : "Break-even "}
            {s.result !== "breakeven" && signed(s.partnerSignedResult)}
          </div>
          <div className="mt-1 text-lg font-bold text-white/90">
            {s.roiPercent > 0 ? "+" : ""}
            {s.roiPercent}% return on your {naira(partner.initialInvestment)}
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 px-5 py-4 text-right backdrop-blur-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/70">You would receive</div>
          <div className="text-2xl font-black">{naira(s.payoutDue)}</div>
          <div className="text-[11px] text-white/70">capital {isLoss ? "minus your loss" : "plus your profit"}</div>
        </div>
      </div>
      {s.lossWasCapped && (
        <p className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold">
          Loss protection: your loss is capped at your invested capital. The farm absorbs the remainder.
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
    { label: "Total income / sales", value: naira(s.totalIncome), tone: "text-emerald-700" },
    { label: "Total expenses (funded by your capital)", value: "-" + naira(s.totalExpenses), tone: "text-rose-700" },
    {
      label: s.net >= 0 ? "Net profit of the cycle" : "Net loss of the cycle",
      value: signed(s.net),
      tone: s.net >= 0 ? "text-emerald-700" : "text-rose-700",
      strong: true,
    },
    {
      label: isLoss
        ? `Your share of the loss (${partner.lossSharePercentage}%)`
        : `Your share of the profit (${partner.profitSharePercentage}%)`,
      value: signed(s.partnerSignedResult),
      tone: isLoss ? "text-rose-700" : "text-emerald-700",
      note: s.lossWasCapped ? "Capped at your capital" : undefined,
    },
    {
      label: isLoss ? "Farm's share of the loss" : "Farm's share of the profit",
      value: naira(s.farmShareAmount),
      tone: "text-slate-700",
    },
    { label: "Your capital invested", value: naira(partner.initialInvestment) },
    {
      label: "Total due to you (capital " + (isLoss ? "−" : "+") + " your result)",
      value: naira(s.payoutDue),
      strong: true,
      tone: "text-[#0F3D24]",
    },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
      <h4 className="text-sm font-black text-[#0F3D24]">Settlement Breakdown</h4>
      <p className="mb-3 text-[11px] text-slate-500">
        {partner.cycleStatus === "open"
          ? "Projected from the figures recorded so far. It updates as entries are added."
          : "Final, frozen at settlement."}
      </p>
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 py-2.5">
            <span className={`${r.strong ? "font-bold text-[#0F3D24]" : "text-slate-600"}`}>
              {r.label}
              {r.note && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">{r.note}</span>}
            </span>
            <span className={`shrink-0 font-black ${r.tone || "text-slate-800"}`}>{r.value}</span>
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
  const payouts = financials.filter((f) => f.type === "payout" && !f.removedAt).sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
  const settled = s.balanceOwed <= 0.01 && s.payoutDue > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-black text-[#0F3D24]">
          <Banknote size={16} className="text-[#3F8F3F]" /> Payout Tracker
        </h4>
        {settled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
            <CheckCircle2 size={11} /> Fully paid
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-end justify-between text-xs">
          <span className="font-bold text-[#0F3D24]">{s.payoutProgressPercent}% paid out</span>
          <span className="text-slate-500">of {naira(s.payoutDue)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#3F8F3F] to-[#a8e6a8] transition-all duration-700"
            style={{ width: `${s.payoutProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#F7F5F0] p-3">
          <div className="text-[10px] font-bold uppercase text-slate-500">Due</div>
          <div className="text-sm font-black text-[#0F3D24]">{naira(s.payoutDue)}</div>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="text-[10px] font-bold uppercase text-emerald-700">Paid</div>
          <div className="text-sm font-black text-emerald-900">{naira(s.paidOut)}</div>
        </div>
        <div className={`rounded-xl p-3 ${s.balanceOwed > 0.01 ? "bg-amber-50" : "bg-slate-50"}`}>
          <div className={`text-[10px] font-bold uppercase ${s.balanceOwed > 0.01 ? "text-amber-700" : "text-slate-500"}`}>
            Balance
          </div>
          <div className={`text-sm font-black ${s.balanceOwed > 0.01 ? "text-amber-900" : "text-slate-700"}`}>
            {naira(Math.max(0, s.balanceOwed))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <Clock size={12} /> Payments received
        </div>
        {payouts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">
            No payouts have been made yet.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-[#3F8F3F]/30 pl-4">
            {payouts.map((p) => (
              <li key={p.id} className="relative">
                <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-[#3F8F3F] ring-4 ring-white" />
                <div className="flex items-center justify-between gap-2 text-xs">
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

// ─── How this is calculated ───────────────────────────────────────────────────

export function HowCalculated({ partner }: { partner: FarmPartner }) {
  const [open, setOpen] = useState(false);
  const p = partner.profitSharePercentage;
  const l = partner.lossSharePercentage;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-black text-[#0F3D24]">
          <Info size={16} className="text-[#3F8F3F]" /> How is this calculated?
        </span>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-700">
          <p>
            <strong>1. Result of the cycle</strong> = total income &minus; total expenses. Every expense and sale is listed
            line by line in the ledger.
          </p>
          <p>
            <strong>2. If the cycle makes a profit</strong>, you receive <strong>{p}%</strong> of it and the farm keeps{" "}
            <strong>{100 - p}%</strong>.
          </p>
          <p>
            <strong>3. If the cycle makes a loss</strong>, you bear <strong>{l}%</strong> of it and the farm bears{" "}
            <strong>{100 - l}%</strong>. Your loss can <em>never</em> exceed the {naira(partner.initialInvestment)} you
            invested.
          </p>
          <p>
            <strong>4. Total due to you</strong> = your capital plus your profit (or minus your loss).{" "}
            <strong>Balance</strong> = total due &minus; payouts already made.
          </p>
          <p className="rounded-lg bg-[#F7F5F0] p-2.5">
            Example: on a {naira(1_000_000)} profit you would receive {naira(1_000_000 * (p / 100))}. On a{" "}
            {naira(1_000_000)} loss you would bear {naira(Math.min(partner.initialInvestment, 1_000_000 * (l / 100)))}.
          </p>
          <p className="text-slate-500">
            Payouts are tracked separately and never counted as income. Entries are never silently deleted: anything
            removed stays visible with the date and reason.
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
    k === "terms_amended" ? "Terms amended" : k === "cycle_closed" ? "Cycle closed & settled" : "Cycle re-opened";
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F3D24]">
        <History size={16} className="text-[#3F8F3F]" /> Changes to your agreement
      </h4>
      <ol className="space-y-3 text-xs">
        {[...partner.auditLog].reverse().map((e, i) => (
          <li key={i} className="rounded-xl bg-[#F7F5F0] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#0F3D24]">{label(e.kind)}</span>
              <span className="text-slate-500">{fmtDate(e.at)}</span>
            </div>
            {e.from && e.to && (
              <div className="mt-1 text-slate-700">
                Profit share {e.from.profit}% → <strong>{e.to.profit}%</strong> · Loss share {e.from.loss}% →{" "}
                <strong>{e.to.loss}%</strong>
              </div>
            )}
            {e.reason && <div className="mt-1 text-slate-600">Reason: {e.reason}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
}
