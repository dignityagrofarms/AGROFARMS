import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Droplets,
  Wheat,
  Thermometer,
  Pill,
  HeartPulse,
  Flag,
  XCircle,
} from "lucide-react";
import {
  adminGetDailyLogDates,
  adminCreateDailyLog,
  adminUpdateDailyLog,
  adminGetBatchFeedLedger,
  type FarmBatch,
  type FarmActivity,
} from "@/lib/farm.functions";
import type { AdminRole } from "@/lib/orders.functions";
import { NumberField } from "@/components/ui/number-field";
import { TypoReviewModal } from "./TypoReviewModal";

const todayStr = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

const FEED_BRAND_CHIPS = ["New Hope", "Top Feeds", "Vital Feed", "Hybrid", "Own Mix"];

type FormState = {
  sickCount: string;
  mortalityCount: string;
  causeOfMortality: string;
  feedGiven: boolean;
  feedConsumedKg: string;
  feedBrand: string;
  feedBagNo: string;
  feedBagStatus: "opened" | "finished" | "";
  waterGiven: boolean;
  temperature: string;
  medicationGiven: string;
  eggsCollected: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  sickCount: "",
  mortalityCount: "",
  causeOfMortality: "",
  feedGiven: true,
  feedConsumedKg: "",
  feedBrand: "",
  feedBagNo: "",
  feedBagStatus: "",
  waterGiven: true,
  temperature: "",
  medicationGiven: "",
  eggsCollected: "",
  notes: "",
});

const fromLog = (l: FarmActivity): FormState => ({
  sickCount: l.sickCount ? String(l.sickCount) : "",
  mortalityCount: l.mortalityCount ? String(l.mortalityCount) : "",
  causeOfMortality: l.causeOfMortality || "",
  feedGiven: l.feedGiven ?? l.feedConsumedKg > 0,
  feedConsumedKg: l.feedConsumedKg ? String(l.feedConsumedKg) : "",
  feedBrand: l.feedBrand || "",
  feedBagNo: l.feedBagNo ? String(l.feedBagNo) : "",
  feedBagStatus: l.feedBagStatus || "",
  waterGiven: l.waterGiven ?? false,
  temperature: l.temperature || "",
  medicationGiven: l.medicationGiven || "",
  eggsCollected: l.eggsCollected ? String(l.eggsCollected) : "",
  notes: l.notes || "",
});

const lastNDays = (n: number) => {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().split("T")[0]);
  }
  return out;
};

export function DailyLogModal({
  passcode,
  role,
  username,
  batches,
  defaultBatchId,
  initialDate,
  onClose,
  onSaved,
}: {
  passcode: string;
  role: AdminRole;
  username?: string;
  batches: FarmBatch[];
  defaultBatchId?: string | null;
  initialDate?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const qc = useQueryClient();
  const getLogsFn = useServerFn(adminGetDailyLogDates);
  const createFn = useServerFn(adminCreateDailyLog);
  const updateFn = useServerFn(adminUpdateDailyLog);
  const getFeedLedgerFn = useServerFn(adminGetBatchFeedLedger);

  const activeBatches = batches.filter((b) => b.status === "active");
  const selectable = activeBatches;
  const initialBatch =
    defaultBatchId && selectable.some((b) => b.id === defaultBatchId)
      ? defaultBatchId
      : selectable[0]?.id || "";
  const [batchId, setBatchId] = useState<string>(initialBatch);
  const [date, setDate] = useState<string>(initialDate || todayStr());
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [showTypoCheck, setShowTypoCheck] = useState(false);

  const batch = batches.find((b) => b.id === batchId);
  const isLayer = /layer|egg/i.test(batch?.batchType || "");
  const isOwner = role === "owner";

  const logsQuery = useQuery({
    queryKey: ["daily-logs", passcode, batchId],
    queryFn: () => getLogsFn({ data: { passcode, batchId } }),
    enabled: Boolean(batchId),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const feedLedgerQuery = useQuery({
    queryKey: ["batch-feed-ledger", passcode, batchId],
    queryFn: () => getFeedLedgerFn({ data: { passcode, batchId } }),
    enabled: Boolean(batchId),
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });

  const logs = logsQuery.data || [];
  const feedLedger = feedLedgerQuery.data;
  const existing = useMemo(() => logs.find((l) => l.activityDate === date) || null, [logs, date]);
  const loggedDates = useMemo(() => new Set(logs.map((l) => l.activityDate)), [logs]);

  const prevLogWithBag = useMemo(
    () => logs.find((l) => l.activityDate < date && l.feedBagNo && l.feedBagStatus) || null,
    [logs, date],
  );
  const prevBagsUsed = prevLogWithBag
    ? (prevLogWithBag.feedBagsUsed ??
      (prevLogWithBag.feedBagStatus === "finished"
        ? prevLogWithBag.feedBagNo || 0
        : Math.max(0, (prevLogWithBag.feedBagNo || 1) - 1)))
    : 0;
  const suggestedNextBagNo = prevLogWithBag
    ? prevLogWithBag.feedBagStatus === "finished"
      ? (prevLogWithBag.feedBagNo || 0) + 1
      : prevLogWithBag.feedBagNo || 1
    : 1;
  const hasNewerBagLogs = useMemo(
    () => Boolean(existing && logs.some((l) => l.activityDate > date && l.feedBagNo)),
    [existing, logs, date],
  );

  // Load the existing log into the form when batch/date changes; otherwise start blank.
  useEffect(() => {
    setError(null);
    if (existing) {
      setForm(fromLog(existing));
    } else {
      const blank = emptyForm();
      if (prevLogWithBag?.feedBrand) {
        blank.feedBrand = prevLogWithBag.feedBrand;
      }
      setForm(blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id, date, batchId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyBagSequence = (nextBagNoRaw: string, nextStatus: "opened" | "finished" | "") => {
    const bagNum =
      nextBagNoRaw.trim() === "" ? 0 : Math.max(1, Math.round(Number(nextBagNoRaw) || 0));
    const kgPerBag = feedLedger?.defaultKgPerBag || 25;
    let nextKg = form.feedConsumedKg;
    if (bagNum >= 1 && (nextStatus === "opened" || nextStatus === "finished")) {
      const cumUsed = nextStatus === "finished" ? bagNum : Math.max(0, bagNum - 1);
      const deltaBags = Math.max(0, cumUsed - prevBagsUsed);
      nextKg = String(Math.round(deltaBags * kgPerBag * 10) / 10);
    }
    setForm((f) => ({
      ...f,
      feedBagNo: nextBagNoRaw,
      feedBagStatus: nextStatus,
      feedConsumedKg: nextKg,
    }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const dead = Number(form.mortalityCount || 0);
      const sick = Number(form.sickCount || 0);
      if (!batchId) throw new Error("Please select a batch.");
      if (dead < 0 || sick < 0) throw new Error("Counts cannot be negative.");
      const bagNo =
        form.feedGiven && form.feedBagNo.trim() !== ""
          ? Math.max(1, Math.round(Number(form.feedBagNo)))
          : null;
      const bagStatus =
        bagNo && (form.feedBagStatus === "opened" || form.feedBagStatus === "finished")
          ? form.feedBagStatus
          : bagNo
            ? "opened"
            : null;
      const bagsUsed =
        bagNo && bagStatus ? (bagStatus === "finished" ? bagNo : Math.max(0, bagNo - 1)) : null;

      const payload = {
        passcode,
        batchId,
        activityDate: date,
        sickCount: sick,
        mortalityCount: dead,
        causeOfMortality: form.causeOfMortality || null,
        feedGiven: form.feedGiven,
        feedConsumedKg: Number(form.feedConsumedKg || 0),
        feedBrand: form.feedBrand || null,
        feedBagNo: bagNo,
        feedBagStatus: bagStatus as "opened" | "finished" | null,
        feedBagsUsed: bagsUsed,
        waterGiven: form.waterGiven,
        temperature: form.temperature || null,
        medicationGiven: form.medicationGiven || null,
        eggsCollected: Number(form.eggsCollected || 0),
        notes: form.notes || null,
      };
      if (existing) {
        const res = await updateFn({ data: { ...payload, id: existing.id } });
        return res.approvalStatus === "pending_approval"
          ? "Daily report updated and resubmitted for Owner approval."
          : "Daily report updated.";
      }
      const res = await createFn({ data: payload });
      return res.approvalStatus === "pending_approval"
        ? "Daily report saved and sent to the Farm Owner for approval."
        : "Daily report saved successfully.";
    },
    onSuccess: (message) => {
      setShowTypoCheck(false);
      qc.invalidateQueries({ queryKey: ["farm-activities"] });
      qc.invalidateQueries({ queryKey: ["farm-batches"] });
      qc.invalidateQueries({ queryKey: ["batch-report"] });
      qc.invalidateQueries({ queryKey: ["daily-logs"] });
      qc.invalidateQueries({ queryKey: ["batch-feed-ledger"] });
      qc.invalidateQueries({ queryKey: ["my-submissions"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals"] });
      qc.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      onSaved(message);
    },
    onError: (e: Error) => {
      setShowTypoCheck(false);
      setError(e.message);
    },
  });

  const canEditExisting =
    !existing ||
    isOwner ||
    ((existing.approvalStatus ?? "approved") !== "approved" &&
      (!username ||
        !existing.recordedBy ||
        existing.recordedBy.toLowerCase() === username.toLowerCase()));
  const locked = Boolean(existing) && !canEditExisting;
  const dead = Number(form.mortalityCount || 0);

  const inputCls =
    "mt-1 w-full rounded-xl border border-[#0F3D24]/15 px-3 py-2.5 text-sm outline-none focus:border-[#3F8F3F] disabled:bg-gray-50 disabled:text-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6">
      <div className="my-auto w-full max-w-2xl rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#0F3D24]">Daily Report</h3>
            <p className="text-xs text-[#0F3D24]/60">
              Fill everything for the day, then save once.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold text-[#0F3D24]">Batch *</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className={inputCls}
            >
              {selectable.length === 0 && <option value="">No batches available</option>}
              {selectable.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} ({b.batchType})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#0F3D24]">Date</label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || todayStr())}
              className={inputCls}
            />
          </div>
        </div>

        {/* Last 7 days strip */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lastNDays(7).map((d) => {
            const done = loggedDates.has(d);
            const label = new Date(d + "T12:00:00").toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
            });
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  d === date
                    ? "border-[#0F3D24] bg-[#0F3D24] text-white"
                    : done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-800"
                }`}
                title={done ? "Logged" : "Not logged yet"}
              >
                {done ? "✓ " : "• "}
                {label}
              </button>
            );
          })}
        </div>

        {existing && (
          <div
            className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${
              existing.approvalStatus === "flagged"
                ? "bg-orange-50 text-orange-950 border border-orange-200"
                : existing.approvalStatus === "rejected"
                  ? "bg-rose-50 text-rose-900 border border-rose-200"
                  : existing.approvalStatus === "pending_approval"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {existing.approvalStatus === "flagged" ? (
              <Flag size={14} className="mt-0.5 shrink-0 text-orange-600" />
            ) : existing.approvalStatus === "rejected" ? (
              <XCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            )}
            <div>
              <span>
                {existing.approvalStatus === "flagged"
                  ? "Flagged by Owner for correction"
                  : existing.approvalStatus === "rejected"
                    ? "Rejected by Owner"
                    : "A report for this day already exists"}
                {existing.approvalStatus === "pending_approval" ? " (awaiting owner approval)" : ""}
                {existing.recordedBy ? ` — logged by ${existing.recordedBy}` : ""}.{" "}
                {canEditExisting
                  ? "You can edit and resubmit it below."
                  : "This approved log is locked; ask the Farm Owner if changes are needed."}
              </span>
              {(existing.approvalStatus === "flagged" || existing.approvalStatus === "rejected") &&
                existing.rejectionReason && (
                  <div className="mt-1 font-bold">
                    {existing.approvalStatus === "flagged" ? "Owner Flag Note: " : "Reason: "}
                    {existing.rejectionReason}
                  </div>
                )}
            </div>
          </div>
        )}

        <fieldset disabled={locked || saveMut.isPending} className="mt-4 space-y-4">
          {/* Health */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-900">
              <HeartPulse size={16} /> Bird Health
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-rose-900">Sick birds</label>
                <NumberField
                  min={0}
                  placeholder="Nil"
                  value={form.sickCount}
                  onValueChange={(_, raw) => set("sickCount", raw)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-900">
                  Dead birds (mortality)
                </label>
                <NumberField
                  min={0}
                  placeholder="Nil"
                  value={form.mortalityCount}
                  onValueChange={(_, raw) => set("mortalityCount", raw)}
                  className={inputCls}
                />
              </div>
            </div>
            {dead > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-bold text-rose-900">Cause of death</label>
                <input
                  type="text"
                  placeholder="e.g. Heat stress, disease, culling"
                  value={form.causeOfMortality}
                  onChange={(e) => set("causeOfMortality", e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Feed & water */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
              <Wheat size={16} /> Feed &amp; Water
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0F3D24]">
                <input
                  type="checkbox"
                  checked={form.feedGiven}
                  onChange={(e) => set("feedGiven", e.target.checked)}
                  className="h-4 w-4 accent-[#0F3D24]"
                />
                Feed given
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0F3D24]">
                <input
                  type="checkbox"
                  checked={form.waterGiven}
                  onChange={(e) => set("waterGiven", e.target.checked)}
                  className="h-4 w-4 accent-[#0F3D24]"
                />
                <Droplets size={14} className="text-sky-600" /> Water given
              </label>
            </div>
            {form.feedGiven && (
              <div className="mt-3 space-y-3">
                {/* Sequential Bag Tracker */}
                <div className="rounded-xl border border-amber-300/80 bg-white/90 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-950">
                      Feed Bag Sequence Tracker (Optional)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {feedLedger && feedLedger.bagsBought > 0 && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                          {feedLedger.bagsBought} bought · {feedLedger.bagsInStock} left (
                          {feedLedger.defaultKgPerBag}kg/bag)
                        </span>
                      )}
                      {prevLogWithBag && (
                        <button
                          type="button"
                          onClick={() => applyBagSequence(String(suggestedNextBagNo), "opened")}
                          className="rounded-full bg-[#0F3D24] px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-[#1B5E3A]"
                        >
                          Use Next: Bag #{suggestedNextBagNo}
                        </button>
                      )}
                    </div>
                  </div>

                  {prevLogWithBag && (
                    <p className="text-[11px] text-amber-900/75">
                      Previous entry ({prevLogWithBag.activityDate}):{" "}
                      <strong>
                        Bag #{prevLogWithBag.feedBagNo}{" "}
                        {prevLogWithBag.feedBagStatus === "finished" ? "Finished" : "Opened"}
                      </strong>{" "}
                      ({prevBagsUsed} total bags finished before this day)
                    </p>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900">Bag #</label>
                      <NumberField
                        min={1}
                        placeholder={`e.g. ${suggestedNextBagNo}`}
                        value={form.feedBagNo}
                        onValueChange={(_, raw) =>
                          applyBagSequence(
                            raw,
                            raw.trim() === "" ? "" : form.feedBagStatus || "opened",
                          )
                        }
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        Bag Status
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            applyBagSequence(form.feedBagNo || String(suggestedNextBagNo), "opened")
                          }
                          className={`rounded-xl py-2 text-xs font-bold border transition ${
                            form.feedBagStatus === "opened"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-white text-amber-900 border-amber-300 hover:bg-amber-50"
                          }`}
                        >
                          Opened
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            applyBagSequence(
                              form.feedBagNo || String(suggestedNextBagNo),
                              "finished",
                            )
                          }
                          className={`rounded-xl py-2 text-xs font-bold border transition ${
                            form.feedBagStatus === "finished"
                              ? "bg-[#0F3D24] text-white border-[#0F3D24]"
                              : "bg-white text-[#0F3D24] border-amber-300 hover:bg-emerald-50"
                          }`}
                        >
                          Finished
                        </button>
                      </div>
                    </div>
                  </div>

                  {feedLedger &&
                    feedLedger.bagsBought > 0 &&
                    Number(form.feedBagNo || 0) > feedLedger.bagsBought && (
                      <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1.5 border border-rose-200">
                        Heads up: Bag #{form.feedBagNo} exceeds the {feedLedger.bagsBought}{" "}
                        purchased bags logged under Expenses for this batch.
                      </p>
                    )}

                  {hasNewerBagLogs && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
                      Note: Later dates already have Bag # logs recorded. Updating this earlier date
                      will not overwrite newer entries.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-amber-900">
                      Quantity (kg){" "}
                      {form.feedBagNo && form.feedBagStatus
                        ? "· Auto-calculated (editable)"
                        : "– optional"}
                    </label>
                    <NumberField
                      allowDecimal
                      min={0}
                      placeholder="e.g. 100"
                      value={form.feedConsumedKg}
                      onValueChange={(_, raw) => set("feedConsumedKg", raw)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900">
                      Feed brand / type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New Hope"
                      value={form.feedBrand}
                      onChange={(e) => set("feedBrand", e.target.value)}
                      className={inputCls}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {FEED_BRAND_CHIPS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set("feedBrand", c)}
                          className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Environment & medication */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-sky-900">
                <Thermometer size={16} /> Pen Temperature
              </div>
              <input
                type="text"
                placeholder="e.g. 28°C or OK"
                value={form.temperature}
                onChange={(e) => set("temperature", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-purple-900">
                <Pill size={16} /> Medication / Vaccine
              </div>
              <input
                type="text"
                placeholder="Nil, or drug / vaccine given"
                value={form.medicationGiven}
                onChange={(e) => set("medicationGiven", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {isLayer && (
            <div>
              <label className="block text-xs font-bold text-[#0F3D24]">
                Eggs collected (pieces)
              </label>
              <NumberField
                min={0}
                value={form.eggsCollected}
                onValueChange={(_, raw) => set("eggsCollected", raw)}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#0F3D24]">Notes</label>
            <textarea
              rows={2}
              placeholder="General observations, pen condition..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={inputCls}
            />
          </div>
        </fieldset>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-5 py-2.5 text-xs font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saveMut.isPending || locked || !batchId}
            onClick={() => {
              setError(null);
              if (isOwner) {
                saveMut.mutate();
              } else {
                setShowTypoCheck(true);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
            {existing
              ? isOwner
                ? "Update Daily Report"
                : "Review & Resubmit Report"
              : isOwner
                ? "Save Daily Report"
                : "Review & Submit Report"}
          </button>
        </div>
      </div>

      <TypoReviewModal
        open={showTypoCheck}
        title={existing ? "Check Updated Daily Report for Typos" : "Review Daily Report for Typos"}
        subtitle="Check counts, feed bags/kg, batch, and notes carefully before sending to the Farm Owner for approval."
        confirmLabel={existing ? "No Typos — Resubmit Report" : "No Typos — Submit Report"}
        isSubmitting={saveMut.isPending}
        onBack={() => setShowTypoCheck(false)}
        onConfirm={() => saveMut.mutate()}
        fields={[
          { label: "Batch", value: batch ? `${batch.batchName} (${batch.batchType})` : batchId },
          { label: "Report Date", value: date },
          {
            label: "Sick Birds",
            value: form.sickCount || "0",
            highlight: Number(form.sickCount || 0) > 0,
          },
          {
            label: "Mortality",
            value: form.mortalityCount || "0",
            highlight: Number(form.mortalityCount || 0) > 0,
          },
          ...(form.causeOfMortality ? [{ label: "Cause", value: form.causeOfMortality }] : []),
          {
            label: "Feed",
            value: form.feedGiven
              ? `${form.feedBrand || "Given"}${form.feedBagNo ? ` · Bag #${form.feedBagNo} (${form.feedBagStatus || "opened"})` : ""}${form.feedConsumedKg ? ` · ${form.feedConsumedKg} kg` : ""}`
              : "Not given",
            highlight: Boolean(form.feedConsumedKg),
          },
          { label: "Water", value: form.waterGiven ? "Given" : "Not given" },
          ...(form.temperature ? [{ label: "Temperature", value: form.temperature }] : []),
          ...(form.medicationGiven ? [{ label: "Medication", value: form.medicationGiven }] : []),
          ...(isLayer && form.eggsCollected
            ? [{ label: "Eggs Collected", value: form.eggsCollected, highlight: true }]
            : []),
          ...(form.notes ? [{ label: "Notes", value: form.notes }] : []),
        ]}
      />
    </div>
  );
}
