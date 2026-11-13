import { RecordHistoryPanel } from "./RecordHistoryPanel";
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
  Flag,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  adminListApprovalsByFilter,
  adminListPendingApprovals,
  adminListRejectedApprovals,
  adminListBatches,
  adminApproveStaffRecord,
  adminApproveAllPending,
  adminRejectStaffRecord,
  adminFlagStaffRecord,
  adminDeleteRejectedRecord,
  adminListMySubmissions,
  adminDismissMySubmission,
  type FarmActivity,
  type FarmFinancial,
} from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";
import { DailyLogModal } from "./DailyLogModal";
import { ActivityEditModal, FinancialEditModal } from "./SubmissionEditModals";

interface PendingApprovalsPanelProps {
  passcode: string;
  role: AdminRole;
  username?: string;
}

type TargetType = "financial" | "activity" | "contact_tx" | "fin_payment";

export function PendingApprovalsPanel({ passcode, role, username }: PendingApprovalsPanelProps) {
  const listHistoryFn = useServerFn(adminListApprovalsByFilter);
  const listPendingFn = useServerFn(adminListPendingApprovals);
  const listRejectedFn = useServerFn(adminListRejectedApprovals);
  const approveFn = useServerFn(adminApproveStaffRecord);
  const approveAllFn = useServerFn(adminApproveAllPending);
  const rejectFn = useServerFn(adminRejectStaffRecord);
  const flagFn = useServerFn(adminFlagStaffRecord);
  const deleteRejectedFn = useServerFn(adminDeleteRejectedRecord);
  const queryClient = useQueryClient();

  const [queueView, setQueueView] = useState<"pending" | "approved" | "rejected" | "all">(
    "pending",
  );
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    targetType: TargetType;
    label: string;
    mode: "flag" | "reject";
  } | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "manager" | "staff">("all");
  const [submitterFilter, setSubmitterFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "earlier" | "today">("all");

  const pendingQuery = useQuery({
    queryKey: ["pending-approvals", passcode],
    queryFn: () => listPendingFn({ data: { passcode } }),
    enabled: role === "owner" && Boolean(passcode),
    refetchInterval: 20000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const historyQuery = useQuery({
    queryKey: ["approval-history", passcode, queueView],
    queryFn: () => listHistoryFn({ data: { passcode, statusFilter: queueView } }),
    enabled:
      role === "owner" && Boolean(passcode) && (queueView === "approved" || queueView === "all"),
  });
  const rejectedQuery = useQuery({
    queryKey: ["rejected-approvals", passcode],
    queryFn: () => listRejectedFn({ data: { passcode } }),
    enabled: role === "owner" && Boolean(passcode),
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["approval-history"] });
    queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
    queryClient.invalidateQueries({ queryKey: ["rejected-approvals"] });
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
      setFeedback(`Approved ${res.approvedCount} unflagged pending record(s).`);
    },
    onError: (e: Error) => alert("Bulk approval failed: " + e.message),
  });

  const rejectMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType; reason?: string }) =>
      rejectFn({
        data: { passcode, id: vars.id, targetType: vars.targetType, reason: vars.reason },
      }),
    onSuccess: () => {
      invalidateAll();
      setActionTarget(null);
      setActionNote("");
      setFeedback("Record rejected and moved to Rejected History.");
    },
    onError: (e: Error) => alert("Rejection failed: " + e.message),
  });

  const flagMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType; note: string }) =>
      flagFn({ data: { passcode, id: vars.id, targetType: vars.targetType, note: vars.note } }),
    onSuccess: () => {
      invalidateAll();
      setActionTarget(null);
      setActionNote("");
      setFeedback(
        "Record flagged! The Manager / Staff member has been notified to fix and resubmit it.",
      );
    },
    onError: (e: Error) => alert("Could not flag record: " + e.message),
  });

  const deleteRejectedMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType }) =>
      deleteRejectedFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      invalidateAll();
      setFeedback("Rejected record permanently deleted.");
    },
    onError: (e: Error) => alert("Delete failed: " + e.message),
  });

  if (role !== "owner") {
    return <MySubmissionsPanel passcode={passcode} role={role} username={username} />;
  }

  const pendingData = pendingQuery.data;
  const rejectedData = rejectedQuery.data;
  const activeData =
    queueView === "approved" || queueView === "all"
      ? historyQuery.data
      : queueView === "rejected"
        ? rejectedData
        : pendingData;

  const pendingTotalCount =
    (pendingData?.financials.length || 0) +
    (pendingData?.activities.length || 0) +
    (pendingData?.contactTransactions.length || 0) +
    (pendingData?.financialPayments.length || 0);
  const rejectedTotalCount =
    (rejectedData?.financials.length || 0) +
    (rejectedData?.activities.length || 0) +
    (rejectedData?.contactTransactions.length || 0) +
    (rejectedData?.financialPayments.length || 0);

  const rawFinancials = activeData?.financials || [];
  const rawActivities = activeData?.activities || [];
  const rawContactTransactions = activeData?.contactTransactions || [];
  const rawFinancialPayments = activeData?.financialPayments || [];
  const partnerPendingCount = pendingData?.partnerPendingCount || 0;

  const unflaggedPendingCount = [
    ...(pendingData?.financials || []),
    ...(pendingData?.activities || []),
    ...(pendingData?.contactTransactions || []),
    ...(pendingData?.financialPayments || []),
  ].filter((x) => x.approvalStatus !== "flagged").length;

  const allPendingItems = [
    ...rawFinancials.map((x) => ({
      role: (x.recordedByRole || "staff") as "owner" | "manager" | "staff",
      username: (x.recordedBy || "staff").toLowerCase(),
      name: x.recordedByName || x.recordedBy || "Staff",
    })),
    ...rawActivities.map((x) => ({
      role: (x.recordedByRole || "staff") as "owner" | "manager" | "staff",
      username: (x.recordedBy || "staff").toLowerCase(),
      name: x.recordedByName || x.recordedBy || "Staff",
    })),
    ...rawContactTransactions.map((x) => ({
      role: (x.recordedByRole || "manager") as "owner" | "manager" | "staff",
      username: (x.recordedBy || "manager").toLowerCase(),
      name: x.recordedByName || x.recordedBy || "Manager",
    })),
    ...rawFinancialPayments.map((x) => ({
      role: (x.recordedByRole || "staff") as "owner" | "manager" | "staff",
      username: (x.recordedBy || "staff").toLowerCase(),
      name: x.recordedByName || x.recordedBy || "Staff",
    })),
  ];

  const managerTotal = allPendingItems.filter((i) => i.role === "manager").length;
  const staffTotal = allPendingItems.filter((i) => i.role === "staff").length;

  const submitterBuckets = Array.from(
    allPendingItems
      .reduce((map, item) => {
        const key = `${item.role}:${item.username}`;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            key,
            username: item.username,
            name: item.name,
            role: item.role,
            count: 1,
          });
        }
        return map;
      }, new Map<string, { key: string; username: string; name: string; role: string; count: number }>())
      .values(),
  ).sort((a, b) => b.count - a.count);

  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

  const matchesSubmitterFilter = (
    recordedBy?: string | null,
    recordedByRole?: string | null,
    defaultRole = "staff",
    recordDate?: string | null,
    createdAt?: string | null,
  ) => {
    const effRole = recordedByRole || defaultRole;
    const effUser = (recordedBy || defaultRole).toLowerCase();
    if (roleFilter !== "all" && effRole !== roleFilter) return false;
    if (submitterFilter !== "all" && `${effRole}:${effUser}` !== submitterFilter) return false;
    if (dateFilter !== "all") {
      const effectiveDay = (createdAt ? createdAt.slice(0, 10) : recordDate || "").slice(0, 10);
      if (dateFilter === "today" && effectiveDay !== todayIso) return false;
      if (dateFilter === "earlier" && (!effectiveDay || effectiveDay >= todayIso)) return false;
    }
    return true;
  };

  const earlierCount = [
    ...rawFinancials.map((x) => (x.createdAt || x.transactionDate || "").slice(0, 10)),
    ...rawActivities.map((x) => (x.createdAt || x.activityDate || "").slice(0, 10)),
    ...rawContactTransactions.map((x) => (x.createdAt || x.transactionDate || "").slice(0, 10)),
    ...rawFinancialPayments.map((x) => (x.createdAt || x.paymentDate || "").slice(0, 10)),
  ].filter((d) => Boolean(d) && d < todayIso).length;

  const financials = rawFinancials.filter((f) =>
    matchesSubmitterFilter(f.recordedBy, f.recordedByRole, "staff", f.transactionDate, f.createdAt),
  );
  const activities = rawActivities.filter((a) =>
    matchesSubmitterFilter(a.recordedBy, a.recordedByRole, "staff", a.activityDate, a.createdAt),
  );
  const contactTransactions = rawContactTransactions.filter((c) =>
    matchesSubmitterFilter(
      c.recordedBy,
      c.recordedByRole,
      "manager",
      c.transactionDate,
      c.createdAt,
    ),
  );
  const financialPayments = rawFinancialPayments.filter((p) =>
    matchesSubmitterFilter(p.recordedBy, p.recordedByRole, "staff", p.paymentDate, p.createdAt),
  );

  const totalCount =
    rawFinancials.length +
    rawActivities.length +
    rawContactTransactions.length +
    rawFinancialPayments.length;
  const filteredCount =
    financials.length + activities.length + contactTransactions.length + financialPayments.length;

  const renderSubmitterBadge = (
    subUsername?: string | null,
    fullName?: string | null,
    subRole?: string | null,
    defaultRole: "manager" | "staff" = "staff",
  ) => {
    const resolvedRole = (subRole || defaultRole) as "owner" | "manager" | "staff";
    const resolvedUser = subUsername || defaultRole;
    const resolvedName = fullName || resolvedUser;
    const isManager = resolvedRole === "manager";
    return (
      <div className="flex flex-col items-start gap-0.5">
        <div className="inline-flex items-center gap-1.5 font-bold text-[#0F3D24]">
          <User size={12} className={isManager ? "text-indigo-600" : "text-amber-700"} />
          <span>{resolvedName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${
              isManager
                ? "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200"
                : "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
            }`}
          >
            {isManager ? "Manager" : "Staff"}
          </span>
          {resolvedName.toLowerCase() !== resolvedUser.toLowerCase() && (
            <span className="font-mono text-[10px] text-slate-500">@{resolvedUser}</span>
          )}
        </div>
      </div>
    );
  };

  const renderRowActions = (
    id: string,
    targetType: TargetType,
    label: string,
    approvalStatus?: string,
  ) => {
    if (queueView === "approved" || queueView === "all")
      return <span className="capitalize">{approvalStatus || "approved"}</span>;
    if (queueView === "rejected") {
      return (
        <div className="inline-flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={approveMut.isPending || deleteRejectedMut.isPending}
            onClick={() => approveMut.mutate({ id, targetType })}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            title="Recover & Approve back into live ledgers"
          >
            <RotateCcw size={11} /> Re-Approve
          </button>
          <button
            type="button"
            disabled={deleteRejectedMut.isPending || approveMut.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Permanently delete rejected record "${label}"? This cannot be undone.`,
                )
              ) {
                deleteRejectedMut.mutate({ id, targetType });
              }
            }}
            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
            title="Permanently delete"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      );
    }

    const isFlagged = approvalStatus === "flagged";
    return (
      <div className="inline-flex items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={approveMut.isPending}
          onClick={() => approveMut.mutate({ id, targetType })}
          className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={flagMut.isPending}
          onClick={() => {
            setActionNote("");
            setActionTarget({ id, targetType, label, mode: "flag" });
          }}
          className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-800 hover:bg-orange-200 disabled:opacity-50 transition"
          title={isFlagged ? "Update flag note" : "Flag for Manager / Staff correction"}
        >
          <Flag size={11} /> {isFlagged ? "Re-Flag" : "Flag"}
        </button>
        <button
          type="button"
          disabled={rejectMut.isPending}
          onClick={() => {
            setActionNote("");
            setActionTarget({ id, targetType, label, mode: "reject" });
          }}
          className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-200 disabled:opacity-50 transition"
        >
          Reject
        </button>
      </div>
    );
  };

  return (
    <div
      className={`mb-8 rounded-3xl p-6 border shadow-sm space-y-4 ${
        queueView === "rejected"
          ? "bg-rose-50/50 border-rose-200/80"
          : "bg-amber-50/70 border-amber-200/80"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#0F3D24]">
            <ShieldAlert
              size={20}
              className={
                queueView === "rejected" ? "text-rose-600" : "text-amber-600 animate-pulse"
              }
            />
            {queueView === "rejected"
              ? `Rejected History (${rejectedTotalCount})`
              : `Pending Staff & Manager Approvals (${pendingTotalCount})`}
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            {queueView === "rejected"
              ? "Recover accidentally rejected entries with Re-Approve, or permanently delete test/duplicate rows."
              : "Pending & flagged entries remain 100% excluded from live farm totals until you click Approve."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setQueueView("pending")}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                queueView === "pending"
                  ? "bg-[#0F3D24] text-white"
                  : "text-slate-600 hover:text-[#0F3D24]"
              }`}
            >
              Pending Review ({pendingTotalCount})
            </button>
            <button
              type="button"
              onClick={() => setQueueView("rejected")}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                queueView === "rejected"
                  ? "bg-rose-700 text-white"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Rejected History ({rejectedTotalCount})
            </button>
          </div>
          <select
            aria-label="Approval status"
            value={queueView}
            onChange={(e) => setQueueView(e.target.value as typeof queueView)}
            className="rounded-xl border p-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          {queueView === "pending" && unflaggedPendingCount > 0 && (
            <button
              type="button"
              disabled={approveAllMut.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Approve all ${unflaggedPendingCount} unflagged pending record(s) at once?`,
                  )
                ) {
                  approveAllMut.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50 transition"
            >
              {approveAllMut.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Approve All ({unflaggedPendingCount})
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-100/80 px-4 py-2 text-xs font-semibold text-emerald-900">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-900/60 hover:text-emerald-900"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {queueView === "pending" && partnerPendingCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-semibold text-indigo-950">
          <span>
            <strong>{partnerPendingCount}</strong> additional manager-logged partner ledger/flock
            item(s) await verification in <strong>For Partners</strong>.
          </span>
        </div>
      )}

      {totalCount > 0 && (
        <div className="rounded-2xl bg-white/90 p-3.5 border border-amber-200/70 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  key: "all" as const,
                  label: `${queueView === "rejected" ? "All Rejected" : "All Pending"} (${totalCount})`,
                },
                { key: "manager" as const, label: `Managers (${managerTotal})` },
                { key: "staff" as const, label: `Staff (${staffTotal})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setRoleFilter(tab.key);
                    setSubmitterFilter("all");
                  }}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    roleFilter === tab.key
                      ? "bg-[#0F3D24] text-white shadow-xs"
                      : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-amber-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-amber-200" />
              {[
                { key: "all" as const, label: "All Dates" },
                {
                  key: "earlier" as const,
                  label: `Yesterday & Earlier${earlierCount > 0 ? ` (${earlierCount})` : ""}`,
                },
                { key: "today" as const, label: "Today" },
              ].map((df) => (
                <button
                  key={df.key}
                  type="button"
                  onClick={() => setDateFilter(df.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    dateFilter === df.key
                      ? "bg-amber-900 text-white shadow-xs"
                      : "bg-[#F7F5F0] text-[#0F3D24] hover:bg-amber-100"
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
            {(roleFilter !== "all" || submitterFilter !== "all" || dateFilter !== "all") && (
              <span className="text-[11px] font-semibold text-slate-500">
                Showing {filteredCount} of {totalCount} entries
              </span>
            )}
          </div>

          {submitterBuckets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                Filter by Submitter:
              </span>
              <button
                type="button"
                onClick={() => setSubmitterFilter("all")}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                  submitterFilter === "all"
                    ? "bg-amber-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Everyone
              </button>
              {submitterBuckets.map((sb) => (
                <button
                  key={sb.key}
                  type="button"
                  onClick={() => setSubmitterFilter((prev) => (prev === sb.key ? "all" : sb.key))}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                    submitterFilter === sb.key
                      ? "bg-[#0F3D24] text-white"
                      : sb.role === "manager"
                        ? "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 hover:bg-indigo-100"
                        : "bg-amber-50 text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <span>{sb.name}</span>
                  <span className="opacity-70 uppercase text-[9px]">
                    ({sb.role === "manager" ? "Mgr" : "Staff"} · {sb.count})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(historyQuery.error || pendingQuery.error || rejectedQuery.error) && (
        <p role="alert" className="text-red-700">
          {(historyQuery.error || pendingQuery.error || rejectedQuery.error)?.message}
        </p>
      )}
      <RecordHistoryPanel passcode={passcode} owner />
      {(
        queueView === "approved" || queueView === "all"
          ? historyQuery.isLoading
          : queueView === "rejected"
            ? rejectedQuery.isLoading
            : pendingQuery.isLoading
      ) ? (
        <div className="py-6 text-center text-xs text-[#0F3D24]/60">
          <Loader2 size={18} className="animate-spin mx-auto mb-1" />{" "}
          {queueView === "rejected"
            ? "Loading rejected history..."
            : "Checking pending approvals..."}
        </div>
      ) : totalCount === 0 ? (
        <div className="py-4 text-center text-xs font-semibold text-[#0F3D24]/60">
          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
          {queueView === "rejected"
            ? "No rejected records in history."
            : "No records match this status."}
        </div>
      ) : filteredCount === 0 ? (
        <div className="py-6 text-center text-xs font-semibold text-[#0F3D24]/60">
          No records match this submitter filter.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Financial Entries */}
          {financials.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Financial Records (
                {financials.length})
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
                              f.type === "income"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {f.type}
                          </span>
                          <span className="ml-2 font-semibold text-[#0F3D24]">{f.category}</span>
                        </td>
                        <td className="p-3 font-bold text-[#0F3D24] tabular-nums">
                          ₦{f.amount.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{f.description}</div>
                          {f.batchName && (
                            <div className="text-[10px] text-gray-500">Batch: {f.batchName}</div>
                          )}
                          {f.approvalStatus === "flagged" && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">
                              <Flag size={10} /> Flagged · Waiting Edit
                              {f.rejectionReason ? `: ${f.rejectionReason}` : ""}
                            </div>
                          )}
                          {queueView === "rejected" && f.rejectionReason && (
                            <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Rejected Note: {f.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderSubmitterBadge(
                            f.recordedBy,
                            f.recordedByName,
                            f.recordedByRole,
                            "staff",
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">
                          {f.transactionDate}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {renderRowActions(
                            f.id,
                            "financial",
                            `${f.category} (₦${f.amount.toLocaleString()})`,
                            f.approvalStatus,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Activity Entries */}
          {activities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <Activity size={14} className="text-blue-600" /> Farm Activities &amp; Daily Reports
                ({activities.length})
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
                              Sick: {a.sickCount ? a.sickCount : "Nil"} · Feed:{" "}
                              {a.feedGiven === false ? "Not given" : a.feedBrand || "Given"}
                              {a.feedBagNo && a.feedBagStatus
                                ? ` (Bag #${a.feedBagNo} ${a.feedBagStatus === "finished" ? "Finished" : "Opened"})`
                                : ""}{" "}
                              · Water: {a.waterGiven ? "✓" : "—"}
                              {a.temperature ? ` · Temp: ${a.temperature}` : ""}
                              {a.medicationGiven ? ` · Med: ${a.medicationGiven}` : ""}{" "}
                            </span>
                          )}
                          {a.mortalityCount > 0 && (
                            <span className="font-bold text-rose-700">
                              Mortality: {a.mortalityCount} birds{" "}
                            </span>
                          )}
                          {a.feedConsumedKg > 0 && <span>Feed: {a.feedConsumedKg} kg </span>}
                          {a.eggsCollected > 0 && <span>Eggs: {a.eggsCollected} </span>}
                          {a.notes && (
                            <div className="text-[10px] text-gray-500 italic">"{a.notes}"</div>
                          )}
                          {a.approvalStatus === "flagged" && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">
                              <Flag size={10} /> Flagged · Waiting Edit
                              {a.rejectionReason ? `: ${a.rejectionReason}` : ""}
                            </div>
                          )}
                          {queueView === "rejected" && a.rejectionReason && (
                            <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Rejected Note: {a.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{a.batchName || "N/A"}</td>
                        <td className="p-3 whitespace-nowrap">
                          {renderSubmitterBadge(
                            a.recordedBy,
                            a.recordedByName,
                            a.recordedByRole,
                            "staff",
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">
                          {a.activityDate}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {renderRowActions(
                            a.id,
                            "activity",
                            `${a.activityType} (${a.activityDate})`,
                            a.approvalStatus,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Special Contact Transactions */}
          {contactTransactions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <Contact size={14} className="text-indigo-600" /> Buyer / Supplier Transactions (
                {contactTransactions.length})
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
                          {c.batchName && (
                            <div className="text-[10px] text-gray-500">Batch: {c.batchName}</div>
                          )}
                          {c.approvalStatus === "flagged" && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">
                              <Flag size={10} /> Flagged · Waiting Edit
                              {c.rejectionReason ? `: ${c.rejectionReason}` : ""}
                            </div>
                          )}
                          {queueView === "rejected" && c.rejectionReason && (
                            <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Rejected Note: {c.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderSubmitterBadge(
                            c.recordedBy,
                            c.recordedByName,
                            c.recordedByRole,
                            "manager",
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">
                          {c.transactionDate}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {renderRowActions(
                            c.id,
                            "contact_tx",
                            `${c.contactName} — ₦${c.totalAmount.toLocaleString()}`,
                            c.approvalStatus,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Follow-up Partial Payments */}
          {financialPayments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-700" /> Credit Balance Payments (
                {financialPayments.length})
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
                          <div className="font-bold text-[#0F3D24]">
                            {p.partyName || "Creditor / Debtor"}
                          </div>
                          <div className="text-[10px] uppercase text-slate-500">
                            {p.financialType === "income"
                              ? "Customer Payment In"
                              : "Supplier Payment Out"}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-emerald-700 tabular-nums">
                          ₦{p.amount.toLocaleString()}
                          <div className="text-[10px] font-normal text-gray-500">
                            {p.paymentMethod}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{p.financialDescription}</div>
                          {p.batchName && (
                            <div className="text-[10px] text-gray-500">Batch: {p.batchName}</div>
                          )}
                          {p.approvalStatus === "flagged" && (
                            <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-900">
                              <Flag size={10} /> Flagged · Waiting Edit
                              {p.rejectionReason ? `: ${p.rejectionReason}` : ""}
                            </div>
                          )}
                          {queueView === "rejected" && p.rejectionReason && (
                            <div className="mt-1 inline-block rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Rejected Note: {p.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {renderSubmitterBadge(
                            p.recordedBy,
                            p.recordedByName,
                            p.recordedByRole,
                            "staff",
                          )}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px] whitespace-nowrap">
                          {p.paymentDate}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {renderRowActions(
                            p.id,
                            "fin_payment",
                            `${p.partyName || "Payment"} — ₦${p.amount.toLocaleString()}`,
                            p.approvalStatus,
                          )}
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

      {/* Flag / Reject Reason Modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-[#0F3D24] flex items-center gap-2">
                {actionTarget.mode === "flag" ? (
                  <>
                    <Flag size={18} className="text-orange-600" /> Flag Entry for Correction
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-rose-600" /> Reject Submission
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Record: <strong className="text-[#0F3D24]">{actionTarget.label}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">
                {actionTarget.mode === "flag"
                  ? "What needs fixing? (Sent to Manager / Staff notifications)"
                  : "Reason for rejection (visible to submitter)"}
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionTarget.mode === "flag"
                    ? "e.g. Typo in amount — please check receipt and correct ₦50,000 to ₦5,000"
                    : "e.g. Wrong batch selected or amount needs receipt verification"
                }
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0F3D24]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600"
              >
                Cancel
              </button>
              {actionTarget.mode === "flag" ? (
                <button
                  type="button"
                  disabled={flagMut.isPending || actionNote.trim().length < 2}
                  onClick={() =>
                    flagMut.mutate({
                      id: actionTarget.id,
                      targetType: actionTarget.targetType,
                      note: actionNote.trim(),
                    })
                  }
                  className="rounded-full bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {flagMut.isPending ? "Flagging..." : "Flag & Notify Submitter"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={rejectMut.isPending}
                  onClick={() =>
                    rejectMut.mutate({
                      id: actionTarget.id,
                      targetType: actionTarget.targetType,
                      reason: actionNote.trim() || undefined,
                    })
                  }
                  className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {rejectMut.isPending ? "Rejecting..." : "Confirm Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shows staff & manager their submitted records along with Owner approval status
 * (Flagged / Pending / Approved / Rejected + notes + Edit & Resubmit + Dismiss).
 */
export function MySubmissionsPanel({
  passcode,
  role,
  username,
}: {
  passcode: string;
  role: AdminRole;
  username?: string;
}) {
  const listFn = useServerFn(adminListMySubmissions);
  const dismissFn = useServerFn(adminDismissMySubmission);
  const listBatchesFn = useServerFn(adminListBatches);
  const qc = useQueryClient();

  const [editingFin, setEditingFin] = useState<FarmFinancial | null>(null);
  const [editingAct, setEditingAct] = useState<FarmActivity | null>(null);
  const [editingDailyLog, setEditingDailyLog] = useState<{
    batchId: string | null;
    date: string;
  } | null>(null);

  const subsQuery = useQuery({
    queryKey: ["my-submissions", passcode],
    queryFn: () => listFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    refetchInterval: 25000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const batchesQuery = useQuery({
    queryKey: ["farm-batches", passcode],
    queryFn: () => listBatchesFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    staleTime: 60000,
  });

  const dismissMut = useMutation({
    mutationFn: (vars: { id: string; targetType: TargetType }) =>
      dismissFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-submissions"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals-count"] });
    },
    onError: (e: Error) => alert("Could not dismiss record: " + e.message),
  });

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("all");
  const items = (subsQuery.data || []).filter(
    (item) =>
      (!fromDate || item.date >= fromDate) &&
      (!toDate || item.date <= toDate) &&
      (submissionStatus === "all" || item.approvalStatus === submissionStatus),
  );
  const flaggedCount = items.filter((i) => i.approvalStatus === "flagged").length;
  const pendingCount = items.filter(
    (i) => i.approvalStatus === "pending_approval" || i.approvalStatus === "pending",
  ).length;
  const rejectedCount = items.filter((i) => i.approvalStatus === "rejected").length;
  const batches = batchesQuery.data || [];

  const handleEditItem = (item: (typeof items)[number]) => {
    if (item.targetType === "financial" && item.financialRecord) {
      setEditingFin(item.financialRecord);
      return;
    }
    if (item.targetType === "activity" && item.activityRecord) {
      if (item.activityRecord.activityType === "Daily Log") {
        setEditingDailyLog({
          batchId: item.activityRecord.batchId ?? null,
          date: item.activityRecord.activityDate,
        });
      } else {
        setEditingAct(item.activityRecord);
      }
    }
  };

  return (
    <div className="mb-8 rounded-3xl bg-white p-6 ring-1 ring-[#0F3D24]/10 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-[#0F3D24] flex items-center gap-2">
            <Clock size={18} className="text-[#3F8F3F]" /> My Submitted Records
          </h2>
          <p className="text-xs text-[#0F3D24]/65">
            Track Owner review status. You can edit any pending, flagged, or rejected record to fix
            typos and resubmit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {flaggedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-orange-800">
              <Flag size={11} /> {flaggedCount} Flagged (Fix Needed)
            </span>
          )}
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

      <div className="flex flex-wrap gap-3 text-sm">
        <label>
          From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <select
          aria-label="Submission status"
          value={submissionStatus}
          onChange={(e) => setSubmissionStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending_approval">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <RecordHistoryPanel passcode={passcode} />
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
              {items.map((item) => {
                const canEdit =
                  item.approvalStatus !== "approved" &&
                  ((item.targetType === "financial" && Boolean(item.financialRecord)) ||
                    (item.targetType === "activity" && Boolean(item.activityRecord)));
                return (
                  <tr
                    key={`${item.targetType}-${item.id}`}
                    className={
                      item.approvalStatus === "flagged"
                        ? "bg-orange-50/40 hover:bg-orange-50/70"
                        : "hover:bg-[#FAF9F6]"
                    }
                  >
                    <td className="p-3">
                      <div className="font-bold text-[#0F3D24]">
                        {item.title}
                        {item.amount !== null && ` · ₦${item.amount.toLocaleString()}`}
                      </div>
                      <div className="text-[11px] text-slate-600">{item.subtitle}</div>
                      {item.approvalStatus === "flagged" && item.rejectionReason && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-900">
                          <Flag size={11} /> Owner Flag Note: {item.rejectionReason}
                        </div>
                      )}
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
                      ) : item.approvalStatus === "flagged" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-800">
                          <Flag size={11} /> Flagged — Action Needed
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
                    <td className="p-3 text-right whitespace-nowrap space-x-1.5">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleEditItem(item)}
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                            item.approvalStatus === "flagged" || item.approvalStatus === "rejected"
                              ? "bg-orange-600 text-white hover:bg-orange-700"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                        >
                          <Pencil size={11} /> Edit &amp; Resubmit
                        </button>
                      )}
                      {item.approvalStatus === "rejected" && (
                        <button
                          type="button"
                          disabled={dismissMut.isPending}
                          onClick={() =>
                            dismissMut.mutate({ id: item.id, targetType: item.targetType })
                          }
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Dismiss
                        </button>
                      )}
                      {!canEdit && item.approvalStatus !== "rejected" && (
                        <span className="text-[10px] text-slate-400">Locked</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingFin && (
        <FinancialEditModal
          passcode={passcode}
          role={role}
          record={editingFin}
          batches={batches}
          onClose={() => setEditingFin(null)}
        />
      )}

      {editingAct && (
        <ActivityEditModal
          passcode={passcode}
          role={role}
          activity={editingAct}
          batches={batches}
          onClose={() => setEditingAct(null)}
        />
      )}

      {editingDailyLog && (
        <DailyLogModal
          passcode={passcode}
          role={role}
          username={username}
          batches={batches}
          defaultBatchId={editingDailyLog.batchId}
          initialDate={editingDailyLog.date}
          onClose={() => setEditingDailyLog(null)}
          onSaved={() => setEditingDailyLog(null)}
        />
      )}
    </div>
  );
}
