import React from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  DollarSign,
  Activity,
  Loader2,
  Layers,
} from "lucide-react";
import {
  adminListPendingApprovals,
  adminApproveStaffRecord,
  adminRejectStaffRecord,
} from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";

interface PendingApprovalsPanelProps {
  passcode: string;
  role: AdminRole;
}

export function PendingApprovalsPanel({ passcode, role }: PendingApprovalsPanelProps) {
  const listPendingFn = useServerFn(adminListPendingApprovals);
  const approveFn = useServerFn(adminApproveStaffRecord);
  const rejectFn = useServerFn(adminRejectStaffRecord);
  const queryClient = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ["pending-approvals", passcode],
    queryFn: () => listPendingFn({ data: { passcode } }),
    enabled: role === "owner" && Boolean(passcode),
    refetchInterval: 15000,
  });

  const approveMut = useMutation({
    mutationFn: (vars: { id: string; targetType: "financial" | "activity" }) =>
      approveFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
    },
    onError: (e: Error) => alert("Approval failed: " + e.message),
  });

  const rejectMut = useMutation({
    mutationFn: (vars: { id: string; targetType: "financial" | "activity" }) =>
      rejectFn({ data: { passcode, id: vars.id, targetType: vars.targetType } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
    },
    onError: (e: Error) => alert("Rejection failed: " + e.message),
  });

  if (role !== "owner") return null;

  const financials = pendingQuery.data?.financials || [];
  const activities = pendingQuery.data?.activities || [];
  const totalCount = financials.length + activities.length;

  return (
    <div className="mb-8 rounded-3xl bg-amber-50/70 p-6 border border-amber-200/80 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200/80 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-[#0F3D24]">
            <ShieldAlert size={20} className="text-amber-600 animate-pulse" />
            Pending Staff Input Approvals ({totalCount})
          </h2>
          <p className="mt-0.5 text-xs text-[#0F3D24]/70">
            Records entered by staff members require your explicit approval before reflecting on live dashboard metrics & financials.
          </p>
        </div>
        <span className="rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold text-amber-900 uppercase">
          {totalCount} Awaiting Review
        </span>
      </div>

      {pendingQuery.isLoading ? (
        <div className="py-6 text-center text-xs text-[#0F3D24]/60">
          <Loader2 size={18} className="animate-spin mx-auto mb-1" /> Checking pending approvals...
        </div>
      ) : totalCount === 0 ? (
        <div className="py-4 text-center text-xs font-semibold text-[#0F3D24]/60">
          <CheckCircle2 size={20} className="mx-auto mb-1 text-emerald-600" />
          No pending staff inputs awaiting approval. All records are up to date!
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Financial Entries */}
          {financials.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F3D24] flex items-center gap-1.5">
                <DollarSign size={14} className="text-emerald-600" /> Financial Records ({financials.length})
              </h3>
              <div className="overflow-hidden rounded-2xl bg-white border border-amber-200/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F5F0] text-[#0F3D24]/80 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Type & Category</th>
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
                        <td className="p-3 font-bold text-[#0F3D24]">₦{f.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <div className="font-medium text-[#0F3D24]">{f.description}</div>
                          {f.batchName && <div className="text-[10px] text-gray-500">Batch: {f.batchName}</div>}
                        </td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <User size={12} /> {f.recordedBy || "staff"}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px]">{f.transactionDate}</td>
                        <td className="p-3 text-right space-x-2">
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
                              if (window.confirm("Reject and delete this staff entry?")) {
                                rejectMut.mutate({ id: f.id, targetType: "financial" });
                              }
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
                <Activity size={14} className="text-blue-600" /> Farm Activities & Mortality Logs ({activities.length})
              </h3>
              <div className="overflow-hidden rounded-2xl bg-white border border-amber-200/60">
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
                          {a.mortalityCount > 0 && (
                            <span className="font-bold text-rose-700">Mortality: {a.mortalityCount} birds </span>
                          )}
                          {a.feedConsumedKg > 0 && <span>Feed: {a.feedConsumedKg} kg </span>}
                          {a.eggsCollected > 0 && <span>Eggs: {a.eggsCollected} </span>}
                          {a.notes && <div className="text-[10px] text-gray-500 italic">"{a.notes}"</div>}
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{a.batchName || "N/A"}</td>
                        <td className="p-3 font-mono text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <User size={12} /> {a.recordedBy || "staff"}
                        </td>
                        <td className="p-3 text-gray-600 text-[11px]">{a.activityDate}</td>
                        <td className="p-3 text-right space-x-2">
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
                              if (window.confirm("Reject and remove this activity record?")) {
                                rejectMut.mutate({ id: a.id, targetType: "activity" });
                              }
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
    </div>
  );
}
