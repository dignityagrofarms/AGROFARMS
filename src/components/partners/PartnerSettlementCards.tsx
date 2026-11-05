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
} from "lucide-react";
import type { FarmPartner, PartnerFinancial } from "@/lib/partners.functions";
import {
  partnerSignAgreement,
  partnerUploadWrittenAgreement,
  adminUploadPartnerDocument,
} from "@/lib/partners.functions";
import { useServerFn } from "@tanstack/react-start";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const signed = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + naira(Math.abs(n));
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── Terms banner ─────────────────────────────────────────────────────────────

export function TermsBanner({
  partner,
  onOpenAgreement,
}: {
  partner: FarmPartner;
  onOpenAgreement?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#3F8F3F]/30 bg-[#3F8F3F]/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#3F8F3F]" size={20} />
        <div className="space-y-2 text-xs flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-extrabold uppercase tracking-wider text-[#0F3D24]">Your Partnership Terms</div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                  partner.agreementSigned
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-800 border border-amber-300"
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
              {onOpenAgreement && (
                <button
                  type="button"
                  onClick={onOpenAgreement}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-[#0F3D24] border border-[#0F3D24]/15 hover:bg-[#0F3D24] hover:text-white transition"
                >
                  Review Terms &rarr;
                </button>
              )}
            </div>
          </div>

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
              {fmtDate(partner.cycleStartDate)} &rarr; {fmtDate(partner.cycleEndDate)}
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
          <div className="mt-1 text-sm sm:text-base font-bold text-white/90">
            {isProfit && `Your ${partner.profitSharePercentage}% share of ${naira(s.net)} net cycle profit`}
            {isLoss && `Your ${partner.lossSharePercentage}% share of ${naira(Math.abs(s.net))} net cycle loss`}
            {!isProfit && !isLoss && "Operations exactly broke even (100% capital preserved)"}
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
          Loss protection active: your loss responsibility is capped at your invested capital. Dignity Agro Farms absorbs the remainder.
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
      label: "Total due to you (capital " + (isLoss ? "\u2212" : "+") + " your result)",
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
  const payouts = financials
    .filter((f) => f.type === "payout" && !f.removedAt)
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));
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
          <Info size={16} className="text-[#3F8F3F]" /> How is profit & loss partitioned?
        </span>
        <ChevronDown size={18} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4 text-xs leading-relaxed text-slate-700">
          <p>
            <strong>1. Operational Result</strong> = Total Sales Income &minus; Total Cycle Expenses. Every expense and sale is itemized line by line in the ledger with full transparency.
          </p>
          <p>
            <strong>2. When operations yield a profit</strong>, you receive <strong>{p}%</strong> of the net profit, and Dignity Agro Farms retains <strong>{100 - p}%</strong>.
          </p>
          <p>
            <strong>3. When operations incur a loss</strong>, your agreed responsibility is <strong>{l}%</strong> of the net loss. However, your loss is <strong>strictly capped at the {naira(partner.initialInvestment)} you invested</strong>. You can never owe negative money or debt beyond your capital.
          </p>
          <p>
            <strong>4. Total Capital Return Due</strong> = Your initial capital adjusted for your net share (Capital + Profit or &minus; Loss). The <strong>Remaining Balance</strong> is this total minus any payouts already disbursed.
          </p>
          <p className="rounded-lg bg-[#F7F5F0] p-2.5">
            Example: On {naira(1_000_000)} net profit, your share is {naira(1_000_000 * (p / 100))}. On {naira(1_000_000)} net loss, you bear {naira(Math.min(partner.initialInvestment, 1_000_000 * (l / 100)))}.
          </p>
          <p className="text-slate-500">
            Payouts are tracked separately as disbursements and never artificially inflate sales revenue. Corrected entries are soft-deleted with date and reason preserved.
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
      ? "Terms amended"
      : k === "cycle_closed"
        ? "Cycle closed & settled"
        : k === "agreement_signed"
          ? "Agreement digitally signed"
          : "Cycle re-opened";

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-[#0F3D24]">
        <History size={16} className="text-[#3F8F3F]" /> Terms & Agreement Audit History
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
}: {
  partner: FarmPartner;
  onOpenSignModal: () => void;
  onOpenUploadModal: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F3D24]/10 text-[#0F3D24]">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-[#0F3D24]">Partnership Terms & Agreement</h3>
            <p className="text-xs text-slate-500">
              Contractual terms governing capital, profit/loss partitioning, and farm operations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
              partner.agreementSigned
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-amber-100 text-amber-800 border border-amber-300"
            }`}
          >
            {partner.agreementSigned ? (
              <>
                <FileCheck2 size={13} /> Digitally Signed & Verified
              </>
            ) : (
              <>
                <AlertCircle size={13} /> Signature Required
              </>
            )}
          </span>
        </div>
      </div>

      {/* Signature Banner / Summary */}
      {partner.agreementSigned ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-900 space-y-1">
          <div className="flex items-center gap-2 font-bold text-emerald-950">
            <CheckCircle2 size={15} className="text-emerald-700" />
            Electronic Signature Certified
          </div>
          <p>
            Digitally signed by <strong>{partner.agreementSignedBy || partner.fullName}</strong> on{" "}
            <strong>{fmtDate(partner.agreementSignedAt)}</strong>.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-bold text-amber-950">Action Needed: Sign Your Partnership Terms</div>
            <p className="text-amber-800">
              Please review your cycle terms and sign electronically directly on the site.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSignModal}
            className="rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white hover:bg-[#165232] transition shadow-sm whitespace-nowrap"
          >
            Read & Sign Agreement &rarr;
          </button>
        </div>
      )}

      {/* Attached Written Agreement (if uploaded) */}
      {partner.agreementDocumentUrl ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-[#F7F5F0] p-4 text-xs">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-[#3F8F3F]" />
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
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] border border-[#0F3D24]/15 hover:bg-[#3F8F3F] hover:text-white transition"
            >
              <ExternalLink size={12} /> View Document
            </a>
            <button
              type="button"
              onClick={onOpenUploadModal}
              className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-dashed border-slate-200 p-4 text-xs">
          <span className="text-slate-500">
            Have a signed physical document or scanned PDF agreement? You can attach it to your portal.
          </span>
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F3D24] border border-[#0F3D24]/20 hover:bg-[#F7F5F0] transition"
          >
            <Upload size={12} /> Upload Written Agreement
          </button>
        </div>
      )}

      {/* Footer controls: Read terms modal button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onOpenSignModal}
          className="text-xs font-bold text-[#3F8F3F] hover:underline flex items-center gap-1"
        >
          <FileText size={13} /> {partner.agreementSigned ? "View Full Terms & Conditions" : "Review Terms"}
        </button>
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
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl ring-1 ring-[#0F3D24]/10">
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
          <div className="rounded-2xl border border-slate-200 bg-[#F7F5F0] p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text">
            {termsText}
          </div>

          {partner.agreementSigned && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 space-y-1">
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
          <form onSubmit={handleSign} className="border-t border-slate-100 p-5 space-y-3 bg-slate-50 rounded-b-3xl text-xs">
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
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !accepted || !legalName.trim()}
                className="rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#165232] disabled:opacity-50 transition"
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
              className="rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-bold text-white hover:bg-[#165232]"
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
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-[#0F3D24]/10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-[#3F8F3F]" />
            <h3 className="text-base font-black text-[#0F3D24]">Upload Written Agreement</h3>
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
              className="w-full text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#0F3D24] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#165232] cursor-pointer"
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
              className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0] p-2.5 text-[#0F3D24] font-medium outline-none focus:border-[#3F8F3F]"
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
              className="w-full rounded-xl border border-slate-200 bg-[#F7F5F0] p-2.5 text-[#0F3D24] font-medium outline-none focus:border-[#3F8F3F]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !fileUrl.trim()}
              className="rounded-full bg-[#0F3D24] px-5 py-2 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
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
