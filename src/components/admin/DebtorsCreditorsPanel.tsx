import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  History,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { type AdminRole } from "@/lib/orders.functions";

const formatNaira = (val: number) =>
  "₦" + Number(val || 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
import {
  adminListDebtorsCreditorsReport,
  adminListFinancialPayments,
  adminRecordFinancialPayment,
  type AgingBucket,
  type DebtorCreditorItem,
  type FarmBatch,
} from "@/lib/farm.functions";
import { NumberField } from "@/components/ui/number-field";

const AGING_LABELS: Record<AgingBucket | "all", string> = {
  all: "All Ages",
  current: "Current / Not Due",
  "1_30": "1–30d Overdue",
  "31_60": "31–60d Overdue",
  "61_90": "61–90d Overdue",
  "90_plus": "90d+ Overdue",
};

const AGING_BADGE_CLASS: Record<AgingBucket, string> = {
  current: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "1_30": "bg-amber-100 text-amber-800 border-amber-200",
  "31_60": "bg-orange-100 text-orange-800 border-orange-200",
  "61_90": "bg-red-100 text-red-700 border-red-200",
  "90_plus": "bg-rose-200 text-rose-900 border-rose-300",
};

export function RecordFinancialPaymentModal({
  passcode,
  role,
  item,
  onClose,
  onSuccess,
}: {
  passcode: string;
  role: AdminRole;
  item: {
    id: string;
    partyName: string;
    description: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    dueDate: string | null;
    kind: "debtor" | "creditor";
  };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<number>(item.balanceDue);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["farm-financial-payments", item.id],
    queryFn: () => adminListFinancialPayments({ data: { passcode, financialId: item.id } }),
    refetchOnWindowFocus: false,
  });

  const recordMut = useMutation({
    mutationFn: () =>
      adminRecordFinancialPayment({
        data: {
          passcode,
          financialId: item.id,
          amount,
          paymentDate,
          paymentMethod,
          referenceNo: referenceNo.trim() || null,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials-all"] });
      queryClient.invalidateQueries({ queryKey: ["farm-batch-report"] });
      queryClient.invalidateQueries({ queryKey: ["debtors-creditors"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financial-payments", item.id] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });

      if (res.approvalStatus === "pending") {
        onSuccess("Payment logged and queued for Owner approval.");
      } else {
        onSuccess(
          res.newAmountPaid >= item.totalAmount - 0.01
            ? `Balance fully settled for ${item.partyName}!`
            : `Recorded ${formatNaira(amount)} payment for ${item.partyName}.`,
        );
      }
      onClose();
    },
    onError: (err: any) => setErrorMsg(err?.message || "Failed to record payment"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 my-8 border border-[#0F3D24]/10">
        <div className="flex items-start justify-between border-b border-[#0F3D24]/10 pb-3">
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase mb-1 ${
                item.kind === "debtor" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              {item.kind === "debtor" ? "Customer Payment In" : "Supplier Payment Out"}
            </span>
            <h3 className="text-lg font-bold text-[#0F3D24] font-serif">{item.partyName}</h3>
            <p className="text-xs text-[#4A5568]">{item.description}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F7F5F0] p-3 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#718096]">Total</div>
            <div className="text-sm font-extrabold text-[#0F3D24]">{formatNaira(item.totalAmount)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-700">Paid So Far</div>
            <div className="text-sm font-extrabold text-emerald-700">{formatNaira(item.amountPaid)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-rose-700">Balance Due</div>
            <div className="text-sm font-extrabold text-rose-700">{formatNaira(item.balanceDue)}</div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#0F3D24]">Payment Amount (₦) *</label>
              <button
                type="button"
                onClick={() => setAmount(item.balanceDue)}
                className="text-[11px] font-bold text-[#3F8F3F] hover:underline"
              >
                Pay Full Balance ({formatNaira(item.balanceDue)})
              </button>
            </div>
            <NumberField
              allowDecimal
              min={0}
              max={item.balanceDue}
              value={amount}
              onValueChange={(n) => setAmount(n ?? 0)}
              className="w-full rounded-xl border border-[#0F3D24]/20 px-3 py-2 text-sm font-bold text-[#0F3D24]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-[#0F3D24]/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-[#0F3D24]/20 px-3 py-2 text-sm bg-white"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">Reference No.</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="Optional bank ref"
                className="w-full rounded-xl border border-[#0F3D24]/20 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 2nd installment"
                className="w-full rounded-xl border border-[#0F3D24]/20 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {role !== "owner" && (
            <p className="text-[11px] font-medium text-amber-700 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
              Note: Payments logged by Manager or Staff require Owner approval before updating the outstanding balance.
            </p>
          )}
        </div>

        {/* Payment History */}
        <div className="border-t border-[#0F3D24]/10 pt-3">
          <h4 className="text-xs font-bold text-[#0F3D24] flex items-center gap-1.5 mb-2">
            <History size={13} className="text-[#3F8F3F]" /> Payment History
          </h4>
          {loadingHistory ? (
            <div className="text-xs text-[#718096] py-2 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Loading payment history...
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-xs text-[#718096] italic">No follow-up installments recorded yet.</p>
          ) : (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-xs bg-[#F7F5F0]/80 rounded-xl px-3 py-1.5"
                >
                  <div>
                    <span className="font-bold text-[#0F3D24]">{formatNaira(h.amount)}</span>
                    <span className="text-[#718096] ml-2">
                      {h.paymentDate} · {h.paymentMethod}
                    </span>
                    {h.notes && <span className="text-[#4A5568] ml-1.5">({h.notes})</span>}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      h.approvalStatus === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : h.approvalStatus === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {h.approvalStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-[#4A5568] hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => recordMut.mutate()}
            disabled={!amount || amount <= 0 || amount > item.balanceDue + 0.01 || recordMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-5 py-2 text-xs font-bold text-white hover:bg-[#1B5E3A] disabled:opacity-50"
          >
            {recordMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {role === "owner" ? "Confirm Payment" : "Submit Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DebtorsCreditorsPanel({
  passcode,
  role,
  batches,
  selectedBatchId,
  onSelectBatchId,
  onNavigateToContacts,
}: {
  passcode: string;
  role: AdminRole;
  batches: FarmBatch[];
  selectedBatchId: string;
  onSelectBatchId: (id: string) => void;
  onNavigateToContacts?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"debtors" | "creditors" | "by_party">("debtors");
  const [agingFilter, setAgingFilter] = useState<AgingBucket | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<DebtorCreditorItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: report, isLoading } = useQuery({
    queryKey: ["debtors-creditors", selectedBatchId],
    queryFn: () =>
      adminListDebtorsCreditorsReport({
        data: { passcode, batchId: selectedBatchId || null },
      }),
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const filteredItems = useMemo(() => {
    if (!report) return [];
    const q = searchQuery.toLowerCase().trim();
    return report.items.filter((item) => {
      if (activeTab === "debtors" && item.kind !== "debtor") return false;
      if (activeTab === "creditors" && item.kind !== "creditor") return false;
      if (agingFilter !== "all" && item.agingBucket !== agingFilter) return false;
      if (q) {
        const hay = `${item.partyName} ${item.description} ${item.category} ${item.batchName || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [report, activeTab, agingFilter, searchQuery]);

  const filteredParties = useMemo(() => {
    if (!report) return [];
    const q = searchQuery.toLowerCase().trim();
    return report.partyTotals.filter((p) => {
      if (!q) return true;
      return `${p.partyName} ${p.partyPhone || ""}`.toLowerCase().includes(q);
    });
  }, [report, searchQuery]);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = [
      "Type",
      "Source",
      "Party Name",
      "Phone",
      "Batch",
      "Category",
      "Description",
      "Transaction Date",
      "Due Date",
      "Days Overdue",
      "Aging Bucket",
      "Total Amount (NGN)",
      "Amount Paid (NGN)",
      "Balance Due (NGN)",
    ];
    const rows = filteredItems.map((i) => [
      i.kind === "debtor" ? "Debtor (Receivable)" : "Creditor (Payable)",
      i.source === "farm_financial" ? "Farm Ledger" : "Special Contact",
      `"${i.partyName.replace(/"/g, '""')}"`,
      i.partyPhone || "",
      `"${(i.batchName || "Unbatched").replace(/"/g, '""')}"`,
      `"${i.category.replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      i.transactionDate,
      i.dueDate || "-",
      i.daysOverdue,
      AGING_LABELS[i.agingBucket],
      i.totalAmount,
      i.amountPaid,
      i.balanceDue,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debtors-creditors-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && !report) {
    return (
      <div className="flex justify-center py-14">
        <Loader2 className="animate-spin text-[#3F8F3F]" size={28} />
      </div>
    );
  }

  const s = report?.summary || {
    totalReceivable: 0,
    totalPayable: 0,
    overdueReceivable: 0,
    overduePayable: 0,
    debtorCount: 0,
    creditorCount: 0,
  };
  const netBalance = s.totalReceivable - s.totalPayable;

  return (
    <div className="space-y-5">
      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} /> {feedback}
          </span>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#718096]">
            <span>Customers Owing Us</span>
            <ArrowDownLeft size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-2">{formatNaira(s.totalReceivable)}</div>
          <div className="text-[11px] font-medium text-[#4A5568] mt-1 flex items-center justify-between">
            <span>{s.debtorCount} open invoice(s)</span>
            {s.overdueReceivable > 0 && (
              <span className="text-rose-600 font-bold">{formatNaira(s.overdueReceivable)} overdue</span>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-rose-600">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#718096]">
            <span>Suppliers We Owe</span>
            <ArrowUpRight size={16} className="text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">{formatNaira(s.totalPayable)}</div>
          <div className="text-[11px] font-medium text-[#4A5568] mt-1 flex items-center justify-between">
            <span>{s.creditorCount} open bill(s)</span>
            {s.overduePayable > 0 && (
              <span className="text-rose-600 font-bold">{formatNaira(s.overduePayable)} overdue</span>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 border-l-4 border-[#0F3D24]">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#718096]">
            <span>Net Credit Position</span>
            <CreditCard size={16} className="text-[#0F3D24]" />
          </div>
          <div className={`text-2xl font-extrabold mt-2 ${netBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {netBalance >= 0 ? "+" : "-"}
            {formatNaira(Math.abs(netBalance))}
          </div>
          <div className="text-[11px] text-[#718096] mt-1">
            {netBalance >= 0 ? "Net receivable ahead of payables" : "Net payable exceeding receivables"}
          </div>
        </div>

        <div className="rounded-3xl bg-[#F7F5F0] p-5 ring-1 ring-[#0F3D24]/10 flex flex-col justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-[#0F3D24]">Batch Scope &amp; Export</div>
          <select
            value={selectedBatchId}
            onChange={(e) => onSelectBatchId(e.target.value)}
            className="mt-2 rounded-xl border border-[#0F3D24]/20 bg-white px-3 py-2 text-xs font-bold text-[#0F3D24] outline-none"
          >
            <option value="">All Farm Batches Combined</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchName} {b.status !== "active" ? "(Closed)" : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCSV}
            className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#0F3D24]/15 px-3 py-1.5 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24]/5"
          >
            <Download size={13} /> Export Aging CSV
          </button>
        </div>
      </div>

      {/* Sub-Tabs & Filters */}
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#0F3D24]/5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("debtors")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "debtors"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-emerald-50"
              }`}
            >
              Customers Owing Us ({s.debtorCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("creditors")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "creditors"
                  ? "bg-rose-700 text-white shadow-sm"
                  : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-rose-50"
              }`}
            >
              Suppliers We Owe ({s.creditorCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("by_party")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "by_party"
                  ? "bg-[#0F3D24] text-white shadow-sm"
                  : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-[#0F3D24]/10"
              }`}
            >
              <Users size={13} /> Totals by Customer / Supplier ({report?.partyTotals.length || 0})
            </button>
          </div>

          <div className="relative flex-1 min-w-[210px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#718096]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, item, batch..."
              className="w-full rounded-xl border border-[#0F3D24]/15 bg-[#F7F5F0]/50 pl-8 pr-3 py-1.5 text-xs text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
            />
          </div>
        </div>

        {activeTab !== "by_party" && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {(Object.keys(AGING_LABELS) as Array<AgingBucket | "all">).map((bucket) => (
              <button
                key={bucket}
                type="button"
                onClick={() => setAgingFilter(bucket)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  agingFilter === bucket
                    ? "bg-[#0F3D24] text-white"
                    : "bg-[#F7F5F0] text-[#4A5568] hover:bg-[#0F3D24]/10"
                }`}
              >
                {AGING_LABELS[bucket]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === "by_party" ? (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5 overflow-x-auto">
          {filteredParties.length === 0 ? (
            <p className="text-sm text-[#718096] text-center py-8">No outstanding customer or supplier balances.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#0F3D24]/10 text-[#718096] uppercase">
                  <th className="py-2.5 pr-4">Party</th>
                  <th className="py-2.5 pr-4">Type</th>
                  <th className="py-2.5 pr-4 text-center">Open Items</th>
                  <th className="py-2.5 pr-4 text-right">Billed Total</th>
                  <th className="py-2.5 pr-4 text-right">Paid</th>
                  <th className="py-2.5 pr-4 text-right">Balance Due</th>
                  <th className="py-2.5 text-right">Max Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F3D24]/5">
                {filteredParties.map((p, idx) => (
                  <tr key={`${p.kind}-${p.partyName}-${idx}`} className="hover:bg-[#F7F5F0]/50">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-[#0F3D24]">{p.partyName}</div>
                      {p.partyPhone && <div className="text-[11px] text-[#718096]">{p.partyPhone}</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          p.kind === "debtor" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {p.kind === "debtor" ? "Debtor (Owes Us)" : "Creditor (We Owe)"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center font-bold text-[#0F3D24]">{p.count}</td>
                    <td className="py-3 pr-4 text-right text-[#4A5568]">{formatNaira(p.totalAmount)}</td>
                    <td className="py-3 pr-4 text-right text-emerald-700 font-semibold">{formatNaira(p.totalPaid)}</td>
                    <td className="py-3 pr-4 text-right font-extrabold text-rose-700">{formatNaira(p.balanceDue)}</td>
                    <td className="py-3 text-right">
                      {p.maxDaysOverdue > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-[10px] font-bold">
                          <AlertTriangle size={10} /> {p.maxDaysOverdue}d overdue
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">Current</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-[#0F3D24]/5">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-[#0F3D24]">
                No matching {activeTab === "debtors" ? "unpaid customer receivables" : "unpaid supplier bills"}.
              </p>
              <p className="text-xs text-[#718096] mt-1">
                When recording an Income or Expense, enter a partial Amount Paid to track remaining balances here.
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={`${item.source}-${item.id}`}
                className="rounded-3xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-[#0F3D24]/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-[#0F3D24]">{item.partyName}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${AGING_BADGE_CLASS[item.agingBucket]}`}
                    >
                      {item.daysOverdue > 0 ? `${item.daysOverdue}d overdue` : "Current / Due Today"}
                    </span>
                    <span className="rounded-full bg-[#F7F5F0] px-2.5 py-0.5 text-[10px] font-bold text-[#4A5568]">
                      {item.source === "contact_tx" ? "Special Contact" : item.category}
                    </span>
                    {item.batchName && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-[#0F3D24]">
                        {item.batchName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#4A5568]">{item.description}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#718096] pt-0.5">
                    <span>Tx Date: {item.transactionDate}</span>
                    {item.dueDate && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0F3D24]">
                        <Clock size={11} /> Due: {item.dueDate}
                      </span>
                    )}
                    {item.partyPhone && <span>Tel: {item.partyPhone}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#0F3D24]/10">
                  <div className="text-right space-y-0.5">
                    <div className="text-[11px] text-[#718096]">
                      Total: <span className="font-bold text-[#0F3D24]">{formatNaira(item.totalAmount)}</span> · Paid:{" "}
                      <span className="font-bold text-emerald-700">{formatNaira(item.amountPaid)}</span>
                    </div>
                    <div className="text-base font-extrabold text-rose-700">
                      Balance: {formatNaira(item.balanceDue)}
                    </div>
                  </div>

                  {item.source === "farm_financial" ? (
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white hover:bg-[#1B5E3A] transition shadow-sm"
                    >
                      <CreditCard size={13} /> Record Payment
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateToContacts?.()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3D24]/20 bg-[#F7F5F0] px-3.5 py-2 text-xs font-bold text-[#0F3D24] hover:bg-[#0F3D24]/10 transition"
                    >
                      <ExternalLink size={13} /> Settle in Contacts
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedItem && (
        <RecordFinancialPaymentModal
          passcode={passcode}
          role={role}
          item={{
            id: selectedItem.id,
            partyName: selectedItem.partyName,
            description: selectedItem.description,
            totalAmount: selectedItem.totalAmount,
            amountPaid: selectedItem.amountPaid,
            balanceDue: selectedItem.balanceDue,
            dueDate: selectedItem.dueDate,
            kind: selectedItem.kind,
          }}
          onClose={() => setSelectedItem(null)}
          onSuccess={(msg) => setFeedback(msg)}
        />
      )}
    </div>
  );
}
