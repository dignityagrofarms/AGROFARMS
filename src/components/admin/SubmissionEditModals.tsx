import React, { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Flag, Loader2, X, XCircle } from "lucide-react";
import {
  adminUpdateFinancial,
  adminUpdateActivity,
  type FarmActivity,
  type FarmBatch,
  type FarmFinancial,
} from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";
import { NumberField } from "@/components/ui/number-field";
import { TypoReviewModal } from "./TypoReviewModal";

function formatNaira(n: number) {
  return `₦${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

/**
 * Shared Edit Financial Record modal used across Financials Ledger, Staff Expenses,
 * My Submissions, and Manager/Staff Notification deep-links.
 * Prompts non-owners with a Typo Review confirmation before saving & resubmitting to the Owner.
 */
export function FinancialEditModal({
  passcode,
  role,
  record,
  batches,
  onClose,
  onSaved,
}: {
  passcode: string;
  role: AdminRole;
  record: FarmFinancial;
  batches: FarmBatch[];
  onClose: () => void;
  onSaved?: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const updateFinancialFn = useServerFn(adminUpdateFinancial);
  const [form, setForm] = useState<FarmFinancial>(() => ({ ...record }));
  const [showTypoCheck, setShowTypoCheck] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStaff = role === "staff";
  const isOwner = role === "owner";

  const updateMut = useMutation({
    mutationFn: (f: FarmFinancial) =>
      updateFinancialFn({
        data: {
          passcode,
          id: f.id,
          batchId: f.batchId || null,
          type: isStaff ? "expense" : f.type,
          category: f.category,
          amount: Number(f.amount),
          amountPaid:
            f.amountPaid !== null && f.amountPaid !== undefined
              ? Number(f.amountPaid)
              : Number(f.amount),
          partyName: f.partyName || null,
          dueDate: f.dueDate || null,
          description: f.description,
          paymentMethod: f.paymentMethod,
          transactionDate: f.transactionDate,
          referenceNo: f.referenceNo || null,
          feedBags:
            (isStaff || f.type === "expense") && f.category === "Feed"
              ? (f.feedBags ?? null)
              : null,
          feedKgPerBag:
            (isStaff || f.type === "expense") && f.category === "Feed"
              ? (f.feedKgPerBag ?? null)
              : null,
          feedBrand:
            (isStaff || f.type === "expense") && f.category === "Feed"
              ? (f.feedBrand ?? null)
              : null,
          birdsSold:
            !isStaff &&
            f.type === "income" &&
            /bird|offload|broiler|chicken|pre-?order/i.test(f.category)
              ? (f.birdsSold ?? null)
              : null,
        },
      }),
    onSuccess: (res) => {
      setShowTypoCheck(false);
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials"] });
      queryClient.invalidateQueries({ queryKey: ["farm-financials-all"] });
      queryClient.invalidateQueries({ queryKey: ["debtors-creditors"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      queryClient.invalidateQueries({ queryKey: ["batch-feed-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      onSaved?.(
        res.approvalStatus === "pending_approval"
          ? "Changes saved and resubmitted to the Farm Owner for approval."
          : "Financial record updated successfully.",
      );
      onClose();
    },
    onError: (e: Error) => {
      setShowTypoCheck(false);
      setErrorMsg(e.message);
    },
  });

  const paid = Number(form.amountPaid ?? form.amount ?? 0);
  const balance = Math.max(0, Number(form.amount || 0) - paid);
  const needsCreditMeta = balance > 0.005;
  const isInvalid =
    !form.amount ||
    Number(form.amount) <= 0 ||
    !form.description.trim() ||
    (needsCreditMeta && (!form.partyName?.trim() || !form.dueDate?.trim()));

  const batchLabel =
    batches.find((b) => b.id === form.batchId)?.batchName || form.batchName || "Unassigned";

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#0F3D24]">
                {isOwner ? "Edit Financial Record" : "Edit & Resubmit Record"}
              </h3>
              {!isOwner && (
                <p className="text-[11px] text-[#0F3D24]/65">
                  Saving updates sends this entry back to the Owner&apos;s approval queue.
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {(record.approvalStatus === "flagged" || record.approvalStatus === "rejected") &&
            record.rejectionReason && (
              <div
                className={`rounded-2xl p-3 text-xs font-semibold flex items-start gap-2 ${
                  record.approvalStatus === "flagged"
                    ? "bg-orange-50 border border-orange-200 text-orange-950"
                    : "bg-rose-50 border border-rose-200 text-rose-900"
                }`}
              >
                {record.approvalStatus === "flagged" ? (
                  <Flag size={15} className="text-orange-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="uppercase text-[10px] font-extrabold block">
                    {record.approvalStatus === "flagged"
                      ? "Owner Flagged for Correction:"
                      : "Owner Rejection Reason:"}
                  </span>
                  {record.rejectionReason}
                </div>
              </div>
            )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {errorMsg}
            </div>
          )}

          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {!isStaff && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1 text-center font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "expense" })}
                  className={`rounded-xl py-2 transition ${form.type === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Expense (Money Out)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "income" })}
                  className={`rounded-xl py-2 transition ${form.type === "income" ? "bg-emerald-600 text-white shadow-xs" : "text-gray-600"}`}
                >
                  Income (Money In)
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Assign to Batch</label>
              <select
                value={form.batchId || ""}
                onChange={(e) => setForm({ ...form, batchId: e.target.value || null })}
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
              >
                {!form.batchId && <option value="">Unassigned (Legacy)</option>}
                {batches
                  .filter((b) => b.status === "active" || b.id === form.batchId)
                  .map((b) => (
                    <option key={b.id} value={b.id} disabled={b.status !== "active"}>
                      {b.batchName} ({b.batchType}){b.status !== "active" ? " (Closed)" : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  {isStaff || form.type === "expense" ? (
                    <>
                      <option value="Feed">Feed &amp; Nutrition</option>
                      <option value="Medication/Vaccine">Medication &amp; Vaccines</option>
                      <option value="Day-Old Chicks">Day-Old Chicks / Stock Purchase</option>
                      <option value="Logistics/Transport">Logistics &amp; Transportation</option>
                      <option value="Labor/Salaries">Labor &amp; Staff Salaries</option>
                      <option value="Utilities">Utilities &amp; Electricity</option>
                      <option value="Equipment">Farm Equipment &amp; Repairs</option>
                      <option value="Packaging">Packaging &amp; Processing</option>
                      <option value="Other Expense">Other Expense</option>
                    </>
                  ) : (
                    <>
                      <option value="Bird Sales">Live &amp; Processed Bird Sales</option>
                      <option value="Egg Sales">Fresh Egg Sales</option>
                      <option value="Pre-orders">Pre-order Inflows</option>
                      <option value="Manure Sales">Poultry Manure Sales</option>
                      <option value="Other Income">Other Income</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Amount (₦) *</label>
                <NumberField
                  allowDecimal
                  min={0}
                  value={form.amount}
                  onValueChange={(n) => setForm({ ...form, amount: n ?? 0 })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Description *</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
              />
            </div>

            {(isStaff || form.type === "expense") && form.category === "Feed" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">
                    Number of Bags
                  </label>
                  <NumberField
                    allowDecimal
                    min={0}
                    value={form.feedBags ?? ""}
                    onValueChange={(n) => setForm({ ...form, feedBags: n ?? null })}
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">
                    Bag Weight (kg)
                  </label>
                  <NumberField
                    allowDecimal
                    min={1}
                    value={form.feedKgPerBag ?? 25}
                    onValueChange={(n) => setForm({ ...form, feedKgPerBag: n ?? 25 })}
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-900">Feed Brand</label>
                  <input
                    type="text"
                    value={form.feedBrand || ""}
                    onChange={(e) => setForm({ ...form, feedBrand: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-[#0F3D24] outline-none"
                  />
                </div>
              </div>
            )}

            {!isStaff &&
              form.type === "income" &&
              /bird|offload|broiler|chicken|pre-?order/i.test(form.category) && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <label className="block text-[11px] font-bold text-emerald-950">
                    Number of Birds Sold (Auto-deducted from Live Birds count)
                  </label>
                  <NumberField
                    min={0}
                    placeholder="e.g. 7 (optional — auto-detected from description if blank)"
                    value={form.birdsSold ?? ""}
                    onValueChange={(n) => setForm({ ...form, birdsSold: n ?? null })}
                    className="mt-1 w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-bold text-[#0F3D24] outline-none"
                  />
                </div>
              )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="POS">POS / Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Transaction Date</label>
                <input
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#F7F5F0]/70 p-3.5 space-y-3 border border-[#0F3D24]/10">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#0F3D24]">Amount Paid (₦)</label>
                {needsCreditMeta && (
                  <span className="text-[11px] font-extrabold text-rose-700">
                    Balance: {formatNaira(balance)}
                  </span>
                )}
              </div>
              <NumberField
                allowDecimal
                min={0}
                max={Number(form.amount || 0) || undefined}
                value={form.amountPaid ?? form.amount}
                onValueChange={(n) => setForm({ ...form, amountPaid: n ?? 0 })}
                className="w-full rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
              />
              {needsCreditMeta && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-rose-700">
                      {form.type === "income" ? "Customer Name *" : "Supplier Name *"}
                    </label>
                    <input
                      type="text"
                      value={form.partyName || ""}
                      onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-700">Due Date *</label>
                    <input
                      type="date"
                      value={form.dueDate || ""}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isInvalid || updateMut.isPending}
              onClick={() => {
                setErrorMsg(null);
                if (isOwner) {
                  updateMut.mutate(form);
                } else {
                  setShowTypoCheck(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {updateMut.isPending && <Loader2 size={13} className="animate-spin" />}
              {isOwner ? "Save Changes" : "Review & Resubmit"}
            </button>
          </div>
        </div>
      </div>

      <TypoReviewModal
        open={showTypoCheck}
        title="Check for Typos Before Resubmitting"
        subtitle="Verify the updated amount, spelling, batch, and date. Once confirmed, this entry returns to the Owner's queue for approval or rejection."
        confirmLabel="Confirm & Resubmit"
        isSubmitting={updateMut.isPending}
        onBack={() => setShowTypoCheck(false)}
        onConfirm={() => updateMut.mutate(form)}
        fields={[
          { label: "Batch", value: batchLabel },
          { label: "Type & Category", value: `${form.type.toUpperCase()} · ${form.category}` },
          { label: "Total Amount", value: formatNaira(Number(form.amount || 0)), highlight: true },
          ...(needsCreditMeta ? [{ label: "Amount Paid", value: formatNaira(paid) }] : []),
          { label: "Description", value: form.description },
          ...(form.category === "Feed" && form.feedBags
            ? [
                {
                  label: "Feed Bags",
                  value: `${form.feedBags} bag(s) × ${form.feedKgPerBag || 25} kg${form.feedBrand ? ` (${form.feedBrand})` : ""}`,
                },
              ]
            : []),
          { label: "Payment Method", value: form.paymentMethod },
          { label: "Transaction Date", value: form.transactionDate },
        ]}
      />
    </>
  );
}

/**
 * Shared Edit Activity modal for single farm activities (Mortality, Feeding, Medication, etc.).
 */
export function ActivityEditModal({
  passcode,
  role,
  activity,
  batches,
  onClose,
  onSaved,
}: {
  passcode: string;
  role: AdminRole;
  activity: FarmActivity;
  batches: FarmBatch[];
  onClose: () => void;
  onSaved?: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const updateActivityFn = useServerFn(adminUpdateActivity);
  const [form, setForm] = useState<FarmActivity>(() => ({ ...activity }));
  const [showTypoCheck, setShowTypoCheck] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isOwner = role === "owner";

  const updateMut = useMutation({
    mutationFn: (a: FarmActivity) =>
      updateActivityFn({
        data: {
          passcode,
          id: a.id,
          batchId: a.batchId || null,
          activityDate: a.activityDate,
          activityType: a.activityType,
          mortalityCount: Number(a.mortalityCount || 0),
          causeOfMortality: a.causeOfMortality || null,
          feedConsumedKg: Number(a.feedConsumedKg || 0),
          eggsCollected: Number(a.eggsCollected || 0),
          medicationGiven: a.medicationGiven || null,
          notes: a.notes || null,
        },
      }),
    onSuccess: (res) => {
      setShowTypoCheck(false);
      queryClient.invalidateQueries({ queryKey: ["farm-activities"] });
      queryClient.invalidateQueries({ queryKey: ["farm-batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-report"] });
      queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      onSaved?.(
        res.approvalStatus === "pending_approval"
          ? "Activity updated and resubmitted for Owner approval."
          : "Activity log updated successfully.",
      );
      onClose();
    },
    onError: (e: Error) => {
      setShowTypoCheck(false);
      setErrorMsg(e.message);
    },
  });

  const batchLabel =
    batches.find((b) => b.id === form.batchId)?.batchName || form.batchName || "General";

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs overflow-y-auto">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 my-auto">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#0F3D24]">
                {isOwner ? "Edit Activity Log" : "Edit & Resubmit Activity Log"}
              </h3>
              {!isOwner && (
                <p className="text-[11px] text-[#0F3D24]/65">
                  Updated entries go back to the Farm Owner&apos;s approval queue.
                </p>
              )}
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {(activity.approvalStatus === "flagged" || activity.approvalStatus === "rejected") &&
            activity.rejectionReason && (
              <div
                className={`rounded-2xl p-3 text-xs font-semibold flex items-start gap-2 ${
                  activity.approvalStatus === "flagged"
                    ? "bg-orange-50 border border-orange-200 text-orange-950"
                    : "bg-rose-50 border border-rose-200 text-rose-900"
                }`}
              >
                {activity.approvalStatus === "flagged" ? (
                  <Flag size={15} className="text-orange-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="uppercase text-[10px] font-extrabold block">
                    {activity.approvalStatus === "flagged"
                      ? "Owner Flagged for Correction:"
                      : "Owner Rejection Reason:"}
                  </span>
                  {activity.rejectionReason}
                </div>
              </div>
            )}

          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Batch *</label>
                <select
                  value={form.batchId || ""}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value || null })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                >
                  <option value="">Select batch...</option>
                  {batches
                    .filter((b) => b.status === "active" || b.id === form.batchId)
                    .map((b) => (
                      <option key={b.id} value={b.id} disabled={b.status !== "active"}>
                        {b.batchName} ({b.batchType})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Date</label>
                <input
                  type="date"
                  value={form.activityDate}
                  onChange={(e) => setForm({ ...form, activityDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Activity Type *</label>
              <select
                value={form.activityType}
                onChange={(e) =>
                  setForm({ ...form, activityType: e.target.value as FarmActivity["activityType"] })
                }
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
              >
                <option value="Mortality Record">Mortality Record (Deducts Headcount)</option>
                <option value="Feeding">Feeding Log</option>
                <option value="Medication / Vaccination">Medication / Vaccination</option>
                <option value="Egg Collection">Egg Collection</option>
                <option value="Cleaning & Sanitation">Cleaning &amp; Sanitation</option>
                <option value="Weight Check">Weight Check</option>
                <option value="Pen Maintenance">Pen Maintenance</option>
                <option value="General Activity">General Farm Activity</option>
              </select>
            </div>

            {form.activityType === "Mortality Record" && (
              <div className="rounded-2xl bg-rose-50 p-3.5 grid gap-3 sm:grid-cols-2 border border-rose-200">
                <div>
                  <label className="block text-xs font-bold text-rose-900">Mortality Count</label>
                  <NumberField
                    min={0}
                    value={form.mortalityCount}
                    onValueChange={(n) => setForm({ ...form, mortalityCount: n ?? 0 })}
                    className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-900">
                    Cause of Mortality
                  </label>
                  <input
                    type="text"
                    value={form.causeOfMortality || ""}
                    onChange={(e) => setForm({ ...form, causeOfMortality: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-sm outline-none"
                  />
                </div>
              </div>
            )}

            {form.activityType === "Feeding" && (
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">Feed Consumed (kg)</label>
                <NumberField
                  allowDecimal
                  min={0}
                  value={form.feedConsumedKg}
                  onValueChange={(n) => setForm({ ...form, feedConsumedKg: n ?? 0 })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            )}

            {form.activityType === "Egg Collection" && (
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">
                  Eggs Collected (Pieces)
                </label>
                <NumberField
                  min={0}
                  value={form.eggsCollected}
                  onValueChange={(n) => setForm({ ...form, eggsCollected: n ?? 0 })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            )}

            {form.activityType === "Medication / Vaccination" && (
              <div>
                <label className="block text-xs font-bold text-[#0F3D24]">
                  Medication / Vaccine Given
                </label>
                <input
                  type="text"
                  value={form.medicationGiven || ""}
                  onChange={(e) => setForm({ ...form, medicationGiven: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2.5 text-sm outline-none focus:border-[#3F8F3F]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">Notes &amp; Remarks</label>
              <textarea
                rows={2}
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-4 py-2 text-sm outline-none focus:border-[#3F8F3F]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!form.batchId || updateMut.isPending}
              onClick={() => {
                setErrorMsg(null);
                if (isOwner) {
                  updateMut.mutate(form);
                } else {
                  setShowTypoCheck(true);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-6 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {updateMut.isPending && <Loader2 size={13} className="animate-spin" />}
              {isOwner ? "Save Changes" : "Review & Resubmit"}
            </button>
          </div>
        </div>
      </div>

      <TypoReviewModal
        open={showTypoCheck}
        title="Check Activity for Typos Before Resubmitting"
        subtitle="Verify the batch, date, counts, and spelling. Confirming sends this updated entry back to the Farm Owner."
        confirmLabel="Confirm & Resubmit"
        isSubmitting={updateMut.isPending}
        onBack={() => setShowTypoCheck(false)}
        onConfirm={() => updateMut.mutate(form)}
        fields={[
          { label: "Batch", value: batchLabel },
          { label: "Date", value: form.activityDate },
          { label: "Activity Type", value: form.activityType },
          ...(form.mortalityCount > 0
            ? [{ label: "Mortality", value: `${form.mortalityCount} bird(s)`, highlight: true }]
            : []),
          ...(form.feedConsumedKg > 0
            ? [{ label: "Feed Consumed", value: `${form.feedConsumedKg} kg`, highlight: true }]
            : []),
          ...(form.eggsCollected > 0
            ? [{ label: "Eggs Collected", value: `${form.eggsCollected}`, highlight: true }]
            : []),
          ...(form.medicationGiven ? [{ label: "Medication", value: form.medicationGiven }] : []),
          ...(form.notes ? [{ label: "Notes", value: form.notes }] : []),
        ]}
      />
    </>
  );
}
