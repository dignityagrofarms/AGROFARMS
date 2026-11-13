import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  previewPartnerAllocationUndo,
  undoPartnerAllocation,
  type UndoFields,
} from "@/lib/allocation-undo.functions";
const money = (n: number) =>
  Number(n || 0).toLocaleString("en-NG", { style: "currency", currency: "NGN" });
export function UndoPartnerAllocation({
  passcode,
  partnerId,
  onUndone,
}: {
  passcode: string;
  partnerId: string;
  onUndone?: () => void;
}) {
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [success, setSuccess] = useState(false);
  const preview = useServerFn(previewPartnerAllocationUndo),
    undo = useServerFn(undoPartnerAllocation),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["allocation-undo", partnerId, passcode],
    queryFn: () => preview({ data: { passcode, partnerId } }),
    enabled: open,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const p = query.data;
      if (!p?.canUndo || !p.changeId) throw new Error("Reload and review the allocation preview");
      return undo({
        data: {
          passcode,
          partnerId,
          changeId: p.changeId,
          allocationVersion: p.allocationVersion,
          batchRevision: p.batchRevision,
          previousBatchRevision: p.previousBatchRevision,
          reason,
        },
      });
    },
    onSuccess: () => {
      setSuccess(true);
      for (const key of [
        "admin-partners",
        "admin-partner-detail",
        "batch-investors",
        "farm-batches",
        "admin-batches",
        "allocation-partners",
        "official-agreements",
      ])
        cache.invalidateQueries({ queryKey: [key] });
      onUndone?.();
    },
  });
  const fields: Array<[string, (f: UndoFields) => string]> = [
    ["Batch", (f) => f.batch_name || "No batch assigned"],
    ["Capital", (f) => money(f.initial_investment)],
    [
      "Birds allocated",
      (f) => (f.allocated_birds == null ? "Not allocated" : String(f.allocated_birds)),
    ],
    [
      "Ownership",
      (f) =>
        f.batch_id ? `${Number(f.batch_allocation_percentage).toFixed(4)}%` : "Not allocated",
    ],
    ["Partner profit share", (f) => `${f.profit_share_percentage}%`],
    ["Partner loss share", (f) => `${f.loss_share_percentage}%`],
    [
      "Automatic synchronization",
      (f) => (f.auto_sync_batch && f.batch_id ? "Enabled" : "Disabled"),
    ],
  ];
  return (
    <>
      <button
        type="button"
        className="min-h-11 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-950"
        onClick={() => {
          setOpen(true);
          setReason("");
          setSuccess(false);
          mutation.reset();
        }}
      >
        Undo batch allocation
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 p-2 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`undo-title-${partnerId}`}
        >
          <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6">
            <div className="flex justify-between gap-3">
              <h2 id={`undo-title-${partnerId}`} className="text-lg font-bold text-emerald-950">
                Undo batch allocation
              </h2>
              <button
                disabled={mutation.isPending}
                aria-label="Close undo preview"
                className="min-h-11 min-w-11"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            {success ? (
              <p role="status" className="rounded-lg bg-emerald-50 p-4">
                The partner’s previous allocation details have been restored. Farm records and audit
                history were preserved.
              </p>
            ) : (
              <>
                {query.isLoading && <p>Loading previous details…</p>}
                {query.error && (
                  <p role="alert" className="text-red-700">
                    {query.error.message}
                  </p>
                )}
                {query.data && (
                  <>
                    <p className="my-3 text-sm">
                      <strong>{query.data.partnerName}</strong> · {query.data.cycleName}. This
                      restores the previous allocation; it does not delete the farm’s batch.
                    </p>
                    {!query.data.canUndo ? (
                      <p role="alert" className="rounded-lg bg-amber-50 p-3">
                        {query.data.reason}
                      </p>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr>
                                <th className="p-2">Detail</th>
                                <th className="p-2">Current</th>
                                <th className="p-2">Restore previous</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fields.map(([label, value]) => (
                                <tr key={label} className="border-t">
                                  <td className="p-2">{label}</td>
                                  <td className="p-2">{value(query.data!.current)}</td>
                                  <td className="p-2">{value(query.data!.previous!)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="my-3 text-sm">
                          The undo reviews {query.data.linkedFinancialCount} synchronized financial
                          records and {query.data.linkedActivityCount} farm logs. Original farm
                          transactions, manual entries and history remain. Conflicting unsigned
                          drafts will need a new version.
                        </p>
                        <label className="block text-sm">
                          Reason for undoing
                          <input
                            required
                            minLength={3}
                            maxLength={500}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 block min-h-11 w-full rounded-lg border p-2"
                          />
                        </label>
                        <button
                          disabled={
                            mutation.isPending ||
                            query.isFetching ||
                            query.isError ||
                            reason.trim().length < 3
                          }
                          onClick={() => mutation.mutate()}
                          className="mt-4 min-h-11 rounded-lg bg-emerald-950 px-4 text-white disabled:opacity-40"
                        >
                          {mutation.isPending ? "Restoring…" : "Undo & restore previous details"}
                        </button>
                      </>
                    )}
                  </>
                )}
                {mutation.error && (
                  <p role="alert" className="mt-3 text-red-700">
                    {mutation.error.message}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
