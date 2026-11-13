import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  DollarSign,
  Activity,
  Loader2,
  CheckCheck,
  Contact,
  X,
} from "lucide-react";
import {
  adminListPendingApprovals,
  adminApproveStaffRecord,
  adminApproveAllPending,
  adminRejectStaffRecord,
  adminListMySubmissions,
  adminDismissMySubmission,
} from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";

interface PendingApprovalsPanelProps {
  passcode: string;
  role: AdminRole;
}

type TargetType = "financial" | "activity" | "contact_tx" | "fin_payment";

export function PendingApprovalsPanel({ passcode, role }: PendingApprovalsPanelProps) {
  const listPendingFn = useServerFn(adminListPendingApprovals);
  const approveFn = useServerFn(adminApproveStaffRecord);
  const approveAllFn = useServerFn(adminApproveAllPending);
  const rejectFn = useServerFn(adminRejectStaffRecord);
  const queryClient = useQueryClient();

  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    targetType: TargetType;
    label: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["pending-approvals", passcode],
    queryFn: () => listPendingFn({ data: { passcode } }),
    enabled: role === "owner" && Boolean(passcode),
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
    queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
    queryClient.invalidateQueries({ queryKey: ["farm-financials-all"] });
    queryClient.invalidateQueries({ queryKey: ["debtors-creditors"] });
    queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
    queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
    queryClient.invalidateQueries({ queryKey: ["batch-report"] });
    queryClient.invalidateQueries({ queryKey: ["special-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
  };

  const approveMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType }) =>
      approveFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      invalidateAll();
      setFeedback("Record approved and synced to live farm ledgers.");
    },
    onError: (e: Error) => alert("Approval failed: " + e.message),
  });

  const approveAllMut = useMutation({
    mutationFn: () => approveAllFn({ data: { passcode } }),
    onSuccess: (res) => {
      invalidateAll();
      setFeedback(`Approved ${res.approvedCount} pending record(s).`);
    },
    onError: (e: Error) => alert("Bulk approval failed: " + e.message),
  });

  const rejectMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType; reason?: string }) =>
      rejectFn({ data: { passcode, id: vars.id, targetType: vars.targetType, reason: vars.reason } }),
    onSuccess: () => {
      invalidateAll();
      setRejectTarget(null);
      setRejectReason("");
      setFeedback("Record rejected with reason sent back to the submitter.");
    },
    onError: (e: Error) => alert("Rejection failed: " + e.message),
  });

  if (role !== "owner") {
    return <MySubmissionsPanel passcode={passcode} />;
  }

  const financials = pendingQuery.data?.financials || [];
  const activities = pendingQuery.data?.activities || [];
  const contactTransactions = pendingQuery.data?.contactTransactions || [];
  const financialPayments = pendingQuery.data?.financialPayments || [];
  const totalCount =
    financials.length + activities.length + contactTransactions.length + financialPayments.length;

  return (
    <div className="mb-8 rounded-3xl bg-amber-50/70 p-6 border border-amber-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#0F3D24]">
            <ShieldAlert size={20} className="text-amber-600 animate-pulse" />
            Pending Staff &amp; Manager Approvals ({totalCount})
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            Records entered by staff or managers require your explicit approval before reflecting on live dashboard metrics &amp; financials.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 && (
            <button
              type="button"
              disabled={approveAllMut.isPending}
              onClick={() => {
                if (window.confirm(`Approve all ${totalCount} pending record(s) at once?`)) {
                  approveAllMut.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition"
            >
              {approveAllMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
              Approve All ({totalCount})
            </button>
          )}
          <span className="rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold text-amber-900 uppercase">
            {totalCount} Awaiting Review
          </span>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-100/80 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-emerald-900/60 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {pendingQuery.isLoading ? (
        <div className="py-6 text-center text-xs text-[#0F3D24]/60">
          <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Checking pending approvals...
        </div>
      ) : totalCount === 0 ? (
        <div className="py-4 text-center text-xs font-semibold text-[#0F3D24]/60">
          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
          No pending inputs awaiting approval. All records are up to date!
        </div>
      ) : (
        <div className="space-y-5">
          {/* Pending Financial Entries */}
          {financials.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Financial Records ({financials.length})
              </h3>
              <div className="overflow-x-auto rounded-2xl bg-white border border-amber-200/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Type &amp; Category</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Description / Batch</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {financials.map((f) => (
                      <tr key={f.id} className="hover:bg-amber-50/40">
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              f.type === "income" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {f.type}
                          </span>
                          <span className="ml-2 font-semibold text-[#0F3D24]">{f.category}</span>
                        </td>
                        <td className="p-3 font-bold text-[#0F3D24] tabular-nums">₦{f.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{f.description}</div>
                          {f.batchName && <div className="text-[10px] text-gray-500">Batch: {f.batchName}</div>}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900">
                          <span className="inline-flex items-center gap-1">
                            <User size={12} /> {f.recordedBy || "staff"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">{f.transactionDate}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate({ id: f.id, targetType: "financial" })}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={rejectMut.isPending}
                            onClick={() => {
                              setRejectReason("");
                              setRejectTarget({
                                id: f.id,
                                targetType: "financial",
                                label: `${f.category} (₦${f.amount.toLocaleString()})`,
                              });
                            }}
                            className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Activity Entries */}
          {activities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <Activity size={14} className="text-blue-600" /> Farm Activities &amp; Daily Reports ({activities.length})
              </h3>
              <div className="overflow-x-auto rounded-2xl bg-white border border-amber-200/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Activity Type</th>
                      <th className="p-3">Details / Metrics</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activities.map((a) => (
                      <tr key={a.id} className="hover:bg-amber-50/40">
                        <td className="p-3 font-semibold text-[#0F3D24]">{a.activityType}</td>
                        <td className="p-3">
                          {a.activityType === "Daily Log" && (
                            <span className="mr-2">
                              Sick: {a.sickCount ? a.sickCount : "Nil"} ·{" "}
                              Feed: {a.feedGiven === false ? "Not given" : a.feedBrand || "Given"}
                              {a.feedBagNo && a.feedBagStatus
                                ? ` (Bag #${a.feedBagNo} ${a.feedBagStatus === "finished" ? "Finished" : "Opened"})`
                                : ""}{" "}
                              · Water: {a.waterGiven ? "✓" : "—"}
                              {a.temperature ? ` · Temp: ${a.temperature}` : ""}
                              {a.medicationGiven ? ` · Med: ${a.medicationGiven}` : ""}{" "}
                            </span>
                          )}
                          {a.mortalityCount > 0 && (
                            <span className="font-bold text-rose-700">Mortality: {a.mortalityCount} birds </span>
                          )}
                          {a.feedConsumedKg > 0 && <span>Feed: {a.feedConsumedKg} kg </span>}
                          {a.eggsCollected > 0 && <span>Eggs: {a.eggsCollected} </span>}
                          {a.notes && <div className="text-[10px] text-gray-500 italic">"{a.notes}"</div>}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{a.batchName || "N/A"}</td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900">
                          <span className="inline-flex items-center gap-1">
                            <User size={12} /> {a.recordedBy || "staff"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">{a.activityDate}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate({ id: a.id, targetType: "activity" })}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={rejectMut.isPending}
                            onClick={() => {
                              setRejectReason("");
                              setRejectTarget({
                                id: a.id,
                                targetType: "activity",
                                label: `${a.activityType} (${a.activityDate})`,
                              });
                            }}
                            className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Special Contact Transactions */}
          {contactTransactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <Contact size={14} className="text-indigo-600" /> Buyer / Supplier Transactions ({contactTransactions.length})
              </h3>
              <div className="overflow-x-auto rounded-2xl bg-white border border-amber-200/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Contact &amp; Type</th>
                      <th className="p-3">Amount / Paid</th>
                      <th className="p-3">Description / Batch</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contactTransactions.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/40">
                        <td className="p-3">
                          <div className="font-bold text-[#0F3D24]">{c.contactName}</div>
                          <div className="text-[10px] uppercase text-slate-500">
                            {c.transactionType.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-[#0F3D24] tabular-nums">
                          ₦{c.totalAmount.toLocaleString()}
                          <div className="text-[10px] font-normal text-emerald-700">
                            Paid: ₦{c.amountPaid.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{c.itemDescription}</div>
                          {c.batchName && <div className="text-[10px] text-gray-500">Batch: {c.batchName}</div>}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900">
                          <span className="inline-flex items-center gap-1">
                            <User size={12} /> {c.recordedBy || "manager"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">{c.transactionDate}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate({ id: c.id, targetType: "contact_tx" })}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={rejectMut.isPending}
                            onClick={() => {
                              setRejectReason("");
                              setRejectTarget({
                                id: c.id,
                                targetType: "contact_tx",
                                label: `${c.contactName} — ₦${c.totalAmount.toLocaleString()}`,
                              });
                            }}
                            className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Follow-up Partial Payments */}
          {financialPayments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-700" /> Credit Balance Payments ({financialPayments.length})
              </h3>
              <div className="overflow-x-auto rounded-2xl bg-white border border-amber-200/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Party &amp; Type</th>
                      <th className="p-3">Payment Amount</th>
                      <th className="p-3">Invoice / Batch</th>
                      <th className="p-3">Recorded By</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {financialPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-amber-50/40">
                        <td className="p-3">
                          <div className="font-bold text-[#0F3D24]">{p.partyName || "Creditor / Debtor"}</div>
                          <div className="text-[10px] uppercase text-slate-500">
                            {p.financialType === "income" ? "Customer Payment In" : "Supplier Payment Out"}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-700 tabular-nums">
                          ₦{p.amount.toLocaleString()}
                          <div className="text-[10px] font-normal text-gray-500">{p.paymentMethod}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{p.financialDescription}</div>
                          {p.batchName && <div className="text-[10px] text-gray-500">Batch: {p.batchName}</div>}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900">
                          <span className="inline-flex items-center gap-1">
                            <User size={12} /> {p.recordedBy || "staff"}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">{p.paymentDate}</td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate({ id: p.id, targetType: "fin_payment" })}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={rejectMut.isPending}
                            onClick={() => {
                              setRejectReason("");
                              setRejectTarget({
                                id: p.id,
                                targetType: "fin_payment",
                                label: `${p.partyName || "Payment"} — ₦${p.amount.toLocaleString()}`,
                              });
                            }}
                            className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
                <XCircle size={18} className="text-rose-600" /> Reject Submission
              </h3>
              <button type="button" onClick={() => setRejectTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Record: <strong className="text-[#0F3D24]">{rejectTarget.label}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">
                Reason for rejection (visible to submitter)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Wrong batch selected or amount needs receipt verification"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0F3D24]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectMut.isPending}
                onClick={() =>
                  rejectMut.mutate({
                    id: rejectTarget.id,
                    targetType: rejectTarget.targetType,
                    reason: rejectReason.trim() || undefined,
                  })
                }
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shows staff & manager their submitted records along with Owner approval status
 * (Pending / Approved / Rejected + rejection reason + Dismiss for rejected rows).
 */
export function MySubmissionsPanel({ passcode }: { passcode: string }) {
  const listFn = useServerFn(adminListMySubmissions);
  const dismissFn = useServerFn(adminDismissMySubmission);
  const qc = useQueryClient();

  const subsQuery = useQuery({
    queryKey: ["my-submissions", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    refetchInterval: 25000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const dismissMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType }) =>
      dismissFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-submissions"] }),
    onError: (e: Error) => alert("Could not dismiss record: " + e.message),
  });

  const items = subsQuery.data || [];
  const pendingCount = items.filter((i) => i.approvalStatus === "pending_approval").length;
  const rejectedCount = items.filter((i) => i.approvalStatus === "rejected").length;

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 ring-1 ring-[#0F3D24]/10 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#0F3D24] flex items-center gap-2">
            <Clock size={18} className="text-[#3F8F3F]" /> My Submitted Records
          </h2>
          <p className="text-xs text-[#0F3D24]/65">
            Track whether your farm entries have been approved by the Farm Owner or need correction.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
              {pendingCount} Pending
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">
              {rejectedCount} Rejected
            </span>
          )}
        </div>
      </div>

      {subsQuery.isLoading ? (
        <div className="py-8 text-center text-xs text-slate-500">Loading your submissions...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          You have no recent submitted records yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Entry</th>
                <th className="p-3">Batch</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={`${item.targetType}-${item.id}`} className="hover:bg-[#FAF9F6]">
                  <td className="p-3">
                    <div className="font-bold text-[#0F3D24]">
                      {item.title}
                      {item.amount !== null && ` · ₦${item.amount.toLocaleString()}`}
                    </div>
                    <div className="text-[11px] text-slate-600">{item.subtitle}</div>
                    {item.approvalStatus === "rejected" && item.rejectionReason && (
                      <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Reason: {item.rejectionReason}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{item.batchName || "—"}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">{item.date}</td>
                  <td className="p-3 whitespace-nowrap">
                    {item.approvalStatus === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 size={11} /> Approved
                      </span>
                    ) : item.approvalStatus === "rejected" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                        <XCircle size={11} /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        <Clock size={11} /> Pending Owner Approval
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {item.approvalStatus === "rejected" ? (
                      <button
                        type="button"
                        disabled={dismissMut.isPending}
                        onClick={() => dismissMut.mutate({ id: item.id, targetType: item.targetType })}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        Dismiss
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
