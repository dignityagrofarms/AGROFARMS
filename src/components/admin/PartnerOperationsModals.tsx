import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  MessageCircle,
  Copy,
  Check,
  X,
  Loader2,
  Eye,
  Clock,
  Calendar,
  Building2,
  ArrowUpRight,
  Sliders,
} from "lucide-react";
import {
  adminDecidePartnerRecordApproval,
  adminRolloverPartnerCycle,
  adminSyncBatchToPartner,
  type FarmPartner,
  type PartnerFinancial,
  type PartnerActivity,
  type PartnerDashboardSummary,
} from "@/lib/partners.functions";
import { NumberField } from "@/components/ui/number-field";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

// ─── 1. Executive Portfolio Health Strip (Admin Partners Home) ────────────────

export function ExecutivePortfolioStrip({
  partners,
  role,
}: {
  partners: FarmPartner[];
  role: "owner" | "manager";
}) {
  const openPartners = partners.filter((p) => p.cycleStatus === "open");
  const totalActiveCapital = openPartners.reduce((s, p) => s + p.initialInvestment, 0);
  const totalPortfolioCapital = partners.reduce((s, p) => s + p.initialInvestment, 0);

  const totalUnpaidLiability = partners.reduce(
    (s, p) => s + Math.max(0, p.settlement.balanceOwed),
    0,
  );

  const farmRetainedProfit = partners.reduce(
    (s, p) => s + (p.settlement.result === "profit" ? p.settlement.farmShareAmount : 0),
    0,
  );

  const totalPendingApprovals = partners.reduce(
    (s, p) => s + (p.pendingApprovalsCount || 0),
    0,
  );

  const now = Date.now();
  const maturingSoonCount = openPartners.filter((p) => {
    if (!p.cycleEndDate) return false;
    const diffDays = (new Date(p.cycleEndDate).getTime() - now) / 86_400_000;
    return diffDays <= 7;
  }).length;

  const electionSubmittedCount = partners.filter((p) => Boolean(p.payoutElection)).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Active Cycle Capital</span>
          <span className="rounded bg-[#FAF9F6] px-2 py-0.5 text-[10px] text-[#0F3D24] border border-slate-200">
            {openPartners.length} Open
          </span>
        </div>
        <div className="mt-2 text-2xl font-black text-[#0F3D24] tabular-nums">
          {naira(totalActiveCapital)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
          Cumulative all-time: {naira(totalPortfolioCapital)}
        </div>
      </div>

      {role === "owner" ? (
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Farm Retained Profit Share</span>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 border border-emerald-200">
              Net Retained
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
            {naira(farmRetainedProfit)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Dignity Agro Farms share across profitable cycles
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Linked Batch Operations</span>
            <span className="rounded bg-[#FAF9F6] px-2 py-0.5 text-[10px] text-[#0F3D24] border border-slate-200">
              Manager Access
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#0F3D24] tabular-nums">
            {partners.filter((p) => Boolean(p.batchId)).length} / {partners.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Partners linked to active farm batches
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Settlement Balance Due</span>
          {electionSubmittedCount > 0 && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800 border border-amber-200">
              {electionSubmittedCount} Instruction(s)
            </span>
          )}
        </div>
        <div className="mt-2 text-2xl font-black text-[#0F3D24] tabular-nums">
          {naira(totalUnpaidLiability)}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Remaining unpaid entitlement across cycles
        </div>
      </div>

      <div className="rounded-2xl border border-[#0F3D24]/10 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>Governance & Alerts</span>
          {totalPendingApprovals > 0 && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
              {totalPendingApprovals} Pending Review
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <div className="text-2xl font-black text-[#0F3D24] tabular-nums">
            {totalPendingApprovals}
          </div>
          <span className="text-xs font-semibold text-slate-600">
            awaiting Owner approval
          </span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {maturingSoonCount > 0
            ? `${maturingSoonCount} cycle(s) within 7 days of target harvest`
            : "All cycle schedules on track"}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Pending Manager Approvals Queue (Inside Partner Detail View) ─────────

export function PendingPartnerApprovalsBanner({
  passcode,
  financials,
  activities,
  viewerRole,
  onPreviewAttachment,
  onUpdated,
}: {
  passcode: string;
  financials: PartnerFinancial[];
  activities: PartnerActivity[];
  viewerRole: "owner" | "manager";
  onPreviewAttachment: (url: string, title: string, subtitle?: string) => void;
  onUpdated: () => void;
}) {
  const decideFn = useServerFn(adminDecidePartnerRecordApproval);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingFins = financials.filter(
    (f) => f.approvalStatus === "pending_approval" && !f.removedAt,
  );
  const pendingActs = activities.filter(
    (a) => a.approvalStatus === "pending_approval" && !a.removedAt,
  );
  const total = pendingFins.length + pendingActs.length;

  if (total === 0) return null;

  const handleDecision = async (
    recordType: "financial" | "activity",
    recordId: string,
    decision: "approved" | "rejected",
  ) => {
    let rejectionReason: string | null = null;
    if (decision === "rejected") {
      rejectionReason = prompt("Enter a short reason for rejecting this manager entry:");
      if (!rejectionReason) return;
    }
    setProcessingId(recordId);
    try {
      await decideFn({
        data: {
          passcode,
          recordType,
          recordId,
          decision,
          rejectionReason,
        },
      });
      onUpdated();
    } catch (err: any) {
      alert(err instanceof Error ? err.message : "Could not process decision.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300/80 bg-amber-50/60 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/70 text-amber-900">
            <ShieldAlert size={17} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#0F3D24]">
              {viewerRole === "owner"
                ? `Manager Entries Awaiting Your Approval (${total})`
                : `Entries Pending Owner Verification (${total})`}
            </h4>
            <p className="text-[11px] text-slate-600">
              {viewerRole === "owner"
                ? "These entries are hidden from the partner's portal until you verify and approve them."
                : "Entries recorded by Management are held in verification queue until approved by the Farm Owner."}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-200/80 px-3 py-1 text-[10px] font-extrabold uppercase text-amber-950">
          Hidden from Partner Until Approved
        </span>
      </div>

      {/* Pending Financials */}
      {pendingFins.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]">
            Pending Financial Entries ({pendingFins.length})
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-amber-200/80 bg-white overflow-hidden text-xs">
            {pendingFins.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-amber-50/30"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                        f.type === "income"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-rose-50 text-rose-800 border border-rose-200"
                      }`}
                    >
                      {f.type === "income" ? "Sale / Income" : "Expense"}
                    </span>
                    <span className="font-bold text-[#0F3D24]">{f.category}</span>
                    <span className="font-black text-[#0F3D24] tabular-nums">
                      {naira(f.amount)}
                    </span>
                  </div>
                  <div className="text-slate-600">{f.description}</div>
                  <div className="text-[11px] text-slate-400">
                    Date: {fmtDate(f.transactionDate)} · Logged by:{" "}
                    <strong className="text-slate-600">{f.recordedBy || "manager"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {f.receiptUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewAttachment(
                          f.receiptUrl!,
                          f.attachmentName || `${f.category} Receipt`,
                          `${naira(f.amount)} · ${fmtDate(f.transactionDate)}`,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-[#FAF9F6] px-2.5 py-1.5 text-[11px] font-bold text-[#0F3D24] hover:bg-slate-100"
                    >
                      <Eye size={12} /> View Receipt
                    </button>
                  )}

                  {viewerRole === "owner" ? (
                    <>
                      <button
                        type="button"
                        disabled={processingId === f.id}
                        onClick={() => handleDecision("financial", f.id, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0F3D24] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#165232] disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={processingId === f.id}
                        onClick={() => handleDecision("financial", f.id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                      <Clock size={11} /> Awaiting Owner
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Activities */}
      {pendingActs.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F3D24]">
            Pending Flock Activity Logs ({pendingActs.length})
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-amber-200/80 bg-white overflow-hidden text-xs">
            {pendingActs.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-amber-50/30"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#FAF9F6] border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-[#0F3D24]">
                      {a.activityType}
                    </span>
                    {a.stockHeadcount > 0 && (
                      <span className="text-emerald-700 font-bold">
                        +{a.stockHeadcount} birds stocked
                      </span>
                    )}
                    {a.mortalityCount > 0 && (
                      <span className="text-rose-700 font-bold">
                        -{a.mortalityCount} mortality
                      </span>
                    )}
                    {a.feedConsumedKg > 0 && (
                      <span className="text-slate-700 font-bold">
                        {a.feedConsumedKg} kg feed
                      </span>
                    )}
                    {a.averageWeightKg > 0 && (
                      <span className="text-[#0F3D24] font-bold">
                        {a.averageWeightKg} kg avg weight
                      </span>
                    )}
                  </div>
                  {a.notes && <div className="text-slate-600">{a.notes}</div>}
                  <div className="text-[11px] text-slate-400">
                    Date: {fmtDate(a.activityDate)} · Logged by:{" "}
                    <strong className="text-slate-600">{a.recordedBy || "manager"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {a.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewAttachment(
                          a.photoUrl!,
                          `${a.activityType} Photo`,
                          fmtDate(a.activityDate),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-[#FAF9F6] px-2.5 py-1.5 text-[11px] font-bold text-[#0F3D24] hover:bg-slate-100"
                    >
                      <Eye size={12} /> Pen Photo
                    </button>
                  )}

                  {viewerRole === "owner" ? (
                    <>
                      <button
                        type="button"
                        disabled={processingId === a.id}
                        onClick={() => handleDecision("activity", a.id, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0F3D24] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#165232] disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={processingId === a.id}
                        onClick={() => handleDecision("activity", a.id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                      <Clock size={11} /> Awaiting Owner
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Per-Partner Multi-Cycle Rollover Modal (Owner Only) ───────────────────

export function RolloverCycleModal({
  passcode,
  partner,
  batches,
  onClose,
  onSuccess,
}: {
  passcode: string;
  partner: FarmPartner;
  batches: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const nextCycleNum = (partner.archivedCycles?.length || 0) + 2;
  const today = new Date().toISOString().slice(0, 10);

  const [newCycleName, setNewCycleName] = useState(`Cycle ${nextCycleNum}`);
  const [newProjectName, setNewProjectName] = useState(partner.projectName || "Broiler Cycle Partnership");
  const [capitalPreset, setCapitalPreset] = useState<"principal" | "entitlement" | "custom">(
    partner.payoutElection?.choice === "rollover_all" ? "entitlement" : "principal",
  );
  const [newInitialInvestment, setNewInitialInvestment] = useState(
    String(
      partner.payoutElection?.choice === "rollover_all"
        ? Math.round(partner.settlement.payoutDue)
        : Math.round(partner.initialInvestment),
    ),
  );
  const [newProfitShare, setNewProfitShare] = useState(String(partner.profitSharePercentage));
  const [newLossShare, setNewLossShare] = useState(String(partner.lossSharePercentage));
  const [newCycleStartDate, setNewCycleStartDate] = useState(today);
  const [newCycleEndDate, setNewCycleEndDate] = useState("");
  const [newBatchId, setNewBatchId] = useState(partner.batchId || "");
  const [rolloverNotes, setRolloverNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const rolloverFn = useServerFn(adminRolloverPartnerCycle);

  const selectPreset = (mode: "principal" | "entitlement" | "custom") => {
    setCapitalPreset(mode);
    if (mode === "principal") {
      setNewInitialInvestment(String(Math.round(partner.initialInvestment)));
    } else if (mode === "entitlement") {
      setNewInitialInvestment(String(Math.round(partner.settlement.payoutDue)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg("");
    try {
      await rolloverFn({
        data: {
          passcode,
          partnerId: partner.id,
          newCycleName: newCycleName.trim(),
          newProjectName: newProjectName.trim(),
          newInitialInvestment: Number(newInitialInvestment) || 0,
          newProfitSharePercentage: Number(newProfitShare),
          newLossSharePercentage: Number(newLossShare),
          newCycleStartDate,
          newCycleEndDate: newCycleEndDate || null,
          newBatchId: newBatchId || null,
          rolloverNotes: rolloverNotes.trim() || null,
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrMsg(err instanceof Error ? err.message : "Could not rollover cycle.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-[#0F3D24]/10 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3D24] text-white">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0F3D24]">
                Archive {partner.cycleName} & Start New Cycle
              </h3>
              <p className="text-xs text-slate-500">
                For <strong>{partner.fullName}</strong> (@{partner.username}) — keeps the same partner login
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-[#FAF9F6] p-3.5 text-xs text-slate-700 space-y-1">
          <div className="font-bold text-[#0F3D24]">
            What happens when you start a new cycle for {partner.fullName}:
          </div>
          <p>
            1. <strong>{partner.cycleName}</strong> (Capital: {naira(partner.initialInvestment)}, Net Entitlement:{" "}
            {naira(partner.settlement.payoutDue)}) and all its ledger transactions & flock logs are permanently
            preserved in <strong>Archived Cycles</strong>.
          </p>
          <p>
            2. A fresh ledger is initialized for <strong>{newCycleName || "the new cycle"}</strong> with the custom terms you configure below for this partner.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-700">
              {errMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">New Cycle Designation *</label>
              <input
                type="text"
                required
                value={newCycleName}
                onChange={(e) => setNewCycleName(e.target.value)}
                placeholder="e.g. Cycle 2 — Festive Batch"
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Project / Operation Name *</label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2.5 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              />
            </div>
          </div>

          {/* Capital Rollover Mode */}
          <div>
            <label className="block font-bold text-[#0F3D24] mb-1.5">
              New Cycle Capital Allocation for {partner.fullName}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
              <button
                type="button"
                onClick={() => selectPreset("principal")}
                className={`rounded-xl border p-2.5 text-left transition ${
                  capitalPreset === "principal"
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 ring-1 ring-[#0F3D24]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-[#0F3D24]">Rollover Principal</div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {naira(partner.initialInvestment)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectPreset("entitlement")}
                className={`rounded-xl border p-2.5 text-left transition ${
                  capitalPreset === "entitlement"
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 ring-1 ring-[#0F3D24]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-[#0F3D24]">Principal + Net Share</div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {naira(partner.settlement.payoutDue)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectPreset("custom")}
                className={`rounded-xl border p-2.5 text-left transition ${
                  capitalPreset === "custom"
                    ? "border-[#0F3D24] bg-[#0F3D24]/5 ring-1 ring-[#0F3D24]"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-[#0F3D24]">Custom Capital</div>
                <div className="text-[11px] text-slate-500">Enter any custom sum</div>
              </button>
            </div>
            <NumberField
              allowDecimal
              min={0}
              required
              value={newInitialInvestment}
              onValueChange={(_, raw) => {
                setNewInitialInvestment(raw);
                setCapitalPreset("custom");
              }}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2.5 text-sm font-black text-[#0F3D24] tabular-nums outline-none focus:border-[#0F3D24]"
            />
          </div>

          {/* Per-Partner Profit & Loss Partitioning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-[#FAF9F6] p-3.5">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">
                Partner Profit Share (%) for {newCycleName}
              </label>
              <NumberField
                allowDecimal
                min={0}
                max={100}
                required
                value={newProfitShare}
                onValueChange={(_, raw) => setNewProfitShare(raw)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-black text-emerald-700 tabular-nums outline-none focus:border-[#0F3D24]"
              />
              <span className="mt-1 block text-[10px] text-slate-500">
                Farm retains {Math.max(0, 100 - (Number(newProfitShare) || 0))}% of net profit
              </span>
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">
                Partner Loss Responsibility (%) for {newCycleName}
              </label>
              <NumberField
                allowDecimal
                min={0}
                max={100}
                required
                value={newLossShare}
                onValueChange={(_, raw) => setNewLossShare(raw)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-black text-rose-700 tabular-nums outline-none focus:border-[#0F3D24]"
              />
              <span className="mt-1 block text-[10px] text-slate-500">
                Strictly capped at {naira(Number(newInitialInvestment) || 0)} capital
              </span>
            </div>
          </div>

          {/* Dates & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">New Cycle Start Date *</label>
              <input
                type="date"
                required
                value={newCycleStartDate}
                onChange={(e) => setNewCycleStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Target Maturity Date</label>
              <input
                type="date"
                value={newCycleEndDate}
                onChange={(e) => setNewCycleEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0F3D24] mb-1">Linked Farm Batch</label>
              <select
                value={newBatchId}
                onChange={(e) => setNewBatchId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 font-semibold text-[#0F3D24] outline-none focus:border-[#0F3D24]"
              >
                <option value="">— No Batch Linked —</option>
                {batches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0F3D24] mb-1">Rollover / Transition Note</label>
            <input
              type="text"
              placeholder="Optional note recorded in the partner's governance audit history..."
              value={rolloverNotes}
              onChange={(e) => setRolloverNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FAF9F6] px-3 py-2 text-[#0F3D24] outline-none focus:border-[#0F3D24]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-5 py-2.5 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Archiving & Starting Cycle...
                </>
              ) : (
                <>
                  <RefreshCw size={14} /> Confirm & Start {newCycleName}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 4. 1-Click Farm Batch -> Partner Sync Modal (Owner & Manager) ────────────

export function BatchSyncModal({
  passcode,
  partner,
  viewerRole,
  onClose,
  onSuccess,
}: {
  passcode: string;
  partner: FarmPartner;
  viewerRole: "owner" | "manager";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [allocationPct, setAllocationPct] = useState("100");
  const [syncFinancials, setSyncFinancials] = useState(true);
  const [syncActivities, setSyncActivities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState("");

  const syncFn = useServerFn(adminSyncBatchToPartner);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrMsg("");
    try {
      const res = await syncFn({
        data: {
          passcode,
          partnerId: partner.id,
          allocationPercentage: partner.batchAllocationPercentage,
          syncFinancials,
          syncActivities,
        },
      });
      setResultMsg(
        `Synced ${res.importedFinancials} financial record(s) and ${res.importedActivities} flock activity log(s)${
          res.approvalStatus === "pending_approval" ? " (queued for Owner approval)" : ""
        }.`,
      );
      onSuccess();
    } catch (err: any) {
      setErrMsg(err instanceof Error ? err.message : "Batch synchronization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-[#0F3D24]/10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D24]/5 text-[#0F3D24]">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-[#0F3D24]">
                Sync Logs from Linked Farm Batch
              </h3>
              <p className="text-[11px] text-slate-500">
                Linked Batch: <strong>{partner.batchName || "None"}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSync} className="space-y-4 text-xs">
          {errMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 font-bold text-rose-700">
              {errMsg}
            </div>
          )}

          {resultMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-bold text-emerald-900">
              {resultMsg}
            </div>
          )}

          <p className="text-slate-600 leading-relaxed">
            Automatically import verified batch expenses, sales, feeding records, and mortality logs from{" "}
            <strong>{partner.batchName}</strong> into <strong>{partner.fullName}</strong>&apos;s workspace without
            re-typing. Previously synced entries are automatically skipped.
          </p>

          <p className="rounded-lg border p-3">Ownership: {partner.allocatedBirds ? `${partner.allocatedBirds} allocated birds · ${partner.batchAllocationPercentage.toFixed(4)}%` : "Awaiting confirmation in Allocate Partners"}. Synchronization uses the saved allocation; manual percentages cannot override it.</p>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-[#FAF9F6] p-3">
            <label className="flex items-center gap-2 font-semibold text-[#0F3D24] cursor-pointer">
              <input
                type="checkbox"
                checked={syncFinancials}
                onChange={(e) => setSyncFinancials(e.target.checked)}
                className="rounded border-slate-300 text-[#0F3D24]"
              />
              Import Batch Expenses & Sales Revenue
            </label>
            <label className="flex items-center gap-2 font-semibold text-[#0F3D24] cursor-pointer">
              <input
                type="checkbox"
                checked={syncActivities}
                onChange={(e) => setSyncActivities(e.target.checked)}
                className="rounded border-slate-300 text-[#0F3D24]"
              />
              Import Daily Feeding, Mortality & Medication Logs
            </label>
          </div>

          {viewerRole === "manager" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
              <strong>Manager Notice:</strong> Imported records will be placed in the{" "}
              <strong>Pending Owner Approval</strong> queue before becoming visible to the partner.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 font-bold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || (!syncFinancials && !syncActivities)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-5 py-2 font-bold text-white hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Syncing...
                </>
              ) : (
                <>
                  <RefreshCw size={13} /> Run Batch Sync
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 5. One-Click Weekly WhatsApp Digest Modal ────────────────────────────────

export function WeeklyWhatsAppDigestModal({
  partner,
  summary,
  onClose,
}: {
  partner: FarmPartner;
  summary: PartnerDashboardSummary;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const s = partner.settlement;
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/for-partners`
      : "https://dignityagrofarms.com/for-partners";

  const survivalPct =
    summary.initialStockCount > 0
      ? `${(100 - summary.mortalityRatePercent).toFixed(1)}%`
      : "100%";

  const digestText = `*DIGNITY AGRO FARMS — PARTNERSHIP PERFORMANCE DIGEST*
Partner: *${partner.fullName}*
Project: *${partner.projectName}* (${partner.cycleName})
Status: *${partner.cycleStatus === "closed" ? "Settled & Closed" : "Active Operations"}*

*1. FLOCK & BIOLOGICAL METRICS*
• Live Flock Count: *${summary.currentStockCount.toLocaleString()} birds* (${survivalPct} survival)
• Total Feed Consumed: *${summary.totalFeedConsumedKg.toLocaleString()} kg*
• Latest Avg Weight: *${summary.latestAverageWeightKg > 0 ? `${summary.latestAverageWeightKg} kg` : "Pending weigh-in"}*
${summary.fcr !== null ? `• Feed Conversion (FCR): *${summary.fcr.toFixed(2)} : 1*\n` : ""}
*2. FINANCIAL & SETTLEMENT POSITION*
• Committed Capital: *${naira(partner.initialInvestment)}*
• Verified Cycle Spend: *${naira(s.totalExpenses)}*
• Verified Sales Logged: *${naira(s.totalIncome)}*
• Agreed Partition: *${partner.profitSharePercentage}% Profit / ${partner.lossSharePercentage}% Loss (Capped)*
• Current Partner Entitlement: *${naira(s.payoutDue)}*

View itemized receipts, charts & downloadable PDF statement on your Partners Portal:
${portalUrl}`;

  const cleanDigits = partner.phone.replace(/\D+/g, "");
  const waPhone = cleanDigits.startsWith("0")
    ? "234" + cleanDigits.slice(1)
    : cleanDigits.startsWith("234")
      ? cleanDigits
      : "234" + cleanDigits;
  const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(digestText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(digestText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(digestText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
    window.open(waHref, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-[#0F3D24]/10 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-[#0F3D24]" />
            <h3 className="text-base font-black text-[#0F3D24]">
              Partner WhatsApp Executive Digest
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <pre className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-[#FAF9F6] p-4 font-mono text-[11px] leading-relaxed text-[#0F3D24] whitespace-pre-wrap">
          {digestText}
        </pre>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#0F3D24] hover:bg-slate-50"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? "Copied to Clipboard" : "Copy Digest Text"}
          </button>
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#165232] transition cursor-pointer shadow-sm"
          >
            <MessageCircle size={14} /> Send on WhatsApp &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
