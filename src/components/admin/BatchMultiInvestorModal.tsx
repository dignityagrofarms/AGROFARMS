import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Layers,
  Loader2,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  adminGetBatchInvestors,
  adminAllocateBatchInvestors,
  type FarmPartner,
} from "@/lib/partners.functions";
import { computeSettlement } from "@/lib/partner-settlement";
import type { FarmBatch } from "@/lib/farm.functions";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const signedNaira = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + naira(Math.abs(n));

interface AllocationDraftRow {
  partnerId: string;
  fullName: string;
  username: string;
  initialInvestment: string;
  profitSharePercentage: string;
  lossSharePercentage: string;
  batchAllocationPercentage: string;
  autoSyncBatch: boolean;
}

export function BatchMultiInvestorModal({
  passcode,
  batches,
  partners,
  initialBatchId,
  onClose,
  onUpdated,
}: {
  passcode: string;
  batches: FarmBatch[];
  partners: FarmPartner[];
  initialBatchId?: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const getBatchInvestorsFn = useServerFn(adminGetBatchInvestors);
  const allocateFn = useServerFn(adminAllocateBatchInvestors);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchId || batches[0]?.id || "",
  );
  const [rows, setRows] = useState<AllocationDraftRow[]>([]);
  const [addPartnerId, setAddPartnerId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const batchInvestorsQuery = useQuery({
    queryKey: ["batch-investors", passcode, selectedBatchId],
    queryFn: () => getBatchInvestorsFn({ data: { passcode, batchId: selectedBatchId } }),
    enabled: Boolean(passcode && selectedBatchId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const data = batchInvestorsQuery.data;
    if (!data) {
      setRows([]);
      return;
    }
    setRows(
      data.investors.map((inv) => ({
        partnerId: inv.partnerId,
        fullName: inv.fullName,
        username: inv.username,
        initialInvestment: String(inv.initialInvestment ?? 0),
        profitSharePercentage: String(inv.profitSharePercentage ?? 30),
        lossSharePercentage: String(inv.lossSharePercentage ?? 30),
        batchAllocationPercentage: String(inv.batchAllocationPercentage ?? 100),
        autoSyncBatch: inv.autoSyncBatch !== false,
      })),
    );
    setErrorMsg(null);
    setSavedMsg(null);
  }, [batchInvestorsQuery.data]);

  const unassignedPartners = partners.filter((p) => !rows.some((r) => r.partnerId === p.id));

  const handleAddPartnerToSplit = () => {
    if (!addPartnerId) return;
    const p = partners.find((x) => x.id === addPartnerId);
    if (!p) return;
    setRows((prev) => [
      ...prev,
      {
        partnerId: p.id,
        fullName: p.fullName,
        username: p.username,
        initialInvestment: String(p.initialInvestment || 0),
        profitSharePercentage: String(p.profitSharePercentage ?? 30),
        lossSharePercentage: String(p.lossSharePercentage ?? p.profitSharePercentage ?? 30),
        batchAllocationPercentage: String(p.batchAllocationPercentage ?? 100),
        autoSyncBatch: true,
      },
    ]);
    setAddPartnerId("");
  };

  const updateRow = (partnerId: string, patch: Partial<AllocationDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.partnerId === partnerId ? { ...r, ...patch } : r)));
  };

  const removeRow = (partnerId: string) => {
    setRows((prev) => prev.filter((r) => r.partnerId !== partnerId));
  };

  const batchSummary = batchInvestorsQuery.data;
  const totalProfitAllocatedPct = rows.reduce(
    (sum, r) => sum + Math.max(0, Number(r.profitSharePercentage) || 0),
    0,
  );
  const farmRetainedPct = Math.round((100 - totalProfitAllocatedPct) * 100) / 100;
  const overAllocated = totalProfitAllocatedPct > 100.001;

  const handleSaveAll = async () => {
    if (!selectedBatchId || rows.length === 0) return;
    if (overAllocated) {
      setErrorMsg(
        `Total partner profit share (${totalProfitAllocatedPct.toFixed(1)}%) cannot exceed 100%.`,
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSavedMsg(null);
    try {
      await allocateFn({
        data: {
          passcode,
          batchId: selectedBatchId,
          allocations: rows.map((r) => ({
            partnerId: r.partnerId,
            initialInvestment: Math.max(0, Number(r.initialInvestment) || 0),
            profitSharePercentage: Math.min(100, Math.max(0, Number(r.profitSharePercentage) || 0)),
            lossSharePercentage: Math.min(100, Math.max(0, Number(r.lossSharePercentage) || 0)),
            batchAllocationPercentage: Math.min(
              100,
              Math.max(1, Number(r.batchAllocationPercentage) || 100),
            ),
            autoSyncBatch: r.autoSyncBatch,
          })),
        },
      });
      await qc.invalidateQueries({ queryKey: ["batch-investors", passcode, selectedBatchId] });
      await qc.invalidateQueries({ queryKey: ["admin-partners"] });
      await qc.invalidateQueries({ queryKey: ["admin-partner-detail"] });
      setSavedMsg(`Calculated and synced ${rows.length} investor settlement(s) for this batch.`);
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save batch allocations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-sm">
      <div className="w-full h-[94dvh] sm:h-auto sm:max-h-[92vh] max-w-4xl rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#0F3D24] px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                Batch Profit &amp; Loss Split (Multi-Investor)
              </h3>
              <p className="text-[11px] text-white/75">
                Assign multiple investors to a single batch and auto-calculate each partner&apos;s
                profit/loss &amp; settlement due.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/75 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Batch Picker */}
          <div className="grid gap-3 sm:grid-cols-2 items-end rounded-2xl bg-[#F7F5F0] p-4 border border-[#0F3D24]/10">
            <div>
              <label className="block text-xs font-bold text-[#0F3D24] mb-1">
                Select Farm Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
              >
                {batches.length === 0 && <option value="">No batches found</option>}
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName} ({b.batchType} · {b.status === "active" ? "Active" : "Closed"} ·
                    Started {b.startDate})
                  </option>
                ))}
              </select>
            </div>

            {unassignedPartners.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[#0F3D24] mb-1">
                    Add Existing Partner to Split
                  </label>
                  <select
                    value={addPartnerId}
                    onChange={(e) => setAddPartnerId(e.target.value)}
                    className="w-full rounded-xl border border-[#0F3D24]/15 bg-white px-3.5 py-2.5 text-xs font-medium text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
                  >
                    <option value="">Choose partner account...</option>
                    {unassignedPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} (@{p.username})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!addPartnerId}
                  onClick={handleAddPartnerToSplit}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#0F3D24] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#165232] disabled:opacity-40 transition"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            )}
          </div>

          {batchInvestorsQuery.isLoading ? (
            <div className="py-10 text-center text-xs text-slate-500">
              <Loader2 size={20} className="animate-spin mx-auto mb-2 text-[#0F3D24]" /> Loading
              batch ledger &amp; investors...
            </div>
          ) : batchSummary ? (
            <>
              {/* Batch Ledger Overview Cards */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                <div className="rounded-2xl bg-[#F7F5F0] p-3.5 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Batch Revenue
                  </span>
                  <div className="mt-1 text-base font-black text-emerald-700 tabular-nums">
                    {naira(batchSummary.totalIncome)}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F7F5F0] p-3.5 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Batch Expenses
                  </span>
                  <div className="mt-1 text-base font-black text-rose-700 tabular-nums">
                    {naira(batchSummary.totalExpense)}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#0F3D24] p-3.5 text-white">
                  <span className="text-[10px] font-bold uppercase text-white/70">
                    Batch Net Outcome
                  </span>
                  <div
                    className={`mt-1 text-base font-black tabular-nums flex items-center gap-1 ${
                      batchSummary.netProfit >= 0 ? "text-[#A2E0A2]" : "text-rose-300"
                    }`}
                  >
                    {batchSummary.netProfit >= 0 ? (
                      <TrendingUp size={15} />
                    ) : (
                      <TrendingDown size={15} />
                    )}
                    {signedNaira(batchSummary.netProfit)}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#F7F5F0] p-3.5 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Investors Allocated
                  </span>
                  <div
                    className={`mt-1 text-base font-black tabular-nums ${
                      overAllocated ? "text-rose-600" : "text-[#0F3D24]"
                    }`}
                  >
                    {totalProfitAllocatedPct.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">
                    Farm Retained %
                  </span>
                  <div className="mt-1 text-base font-black text-emerald-900 tabular-nums">
                    {Math.max(0, farmRetainedPct).toFixed(1)}%
                  </div>
                </div>
              </div>

              {overAllocated && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
                  <AlertTriangle size={16} />
                  Combined Partner Profit Share ({totalProfitAllocatedPct.toFixed(1)}%) exceeds
                  100%. Adjust percentages before saving.
                </div>
              )}

              {/* Investor Allocation List */}
              {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
                  <Users size={26} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-[#0F3D24]">
                    No partners are linked to {batchSummary.batchName} yet.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Use &ldquo;Add Existing Partner to Split&rdquo; above or create a new partner
                    profile linked to this batch.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => {
                    const capital = Math.max(0, Number(r.initialInvestment) || 0);
                    const pPct = Math.min(100, Math.max(0, Number(r.profitSharePercentage) || 0));
                    const lPct = Math.min(100, Math.max(0, Number(r.lossSharePercentage) || 0));
                    const poolRatio =
                      Math.min(100, Math.max(1, Number(r.batchAllocationPercentage) || 100)) / 100;
                    const sim = computeSettlement(
                      {
                        initialInvestment: capital,
                        profitSharePercentage: pPct,
                        lossSharePercentage: lPct,
                      },
                      [
                        { type: "income", amount: batchSummary.totalIncome * poolRatio },
                        { type: "expense", amount: batchSummary.totalExpense * poolRatio },
                      ],
                    );

                    return (
                      <div
                        key={r.partnerId}
                        className="rounded-2xl border border-slate-200 bg-[#FAF9F6] p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-extrabold text-[#0F3D24]">
                              {r.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              @{r.username}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs tabular-nums">
                            <div className="text-right">
                              <span className="text-[10px] uppercase text-slate-500 block">
                                Investor P&amp;L Share
                              </span>
                              <strong
                                className={
                                  sim.partnerSignedResult >= 0
                                    ? "text-emerald-700 font-black"
                                    : "text-rose-700 font-black"
                                }
                              >
                                {signedNaira(sim.partnerSignedResult)}
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase text-slate-500 block">
                                Total Settlement Due
                              </span>
                              <strong className="text-[#0F3D24] font-black">
                                {naira(sim.payoutDue)}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRow(r.partnerId)}
                              title="Remove from draft list"
                              className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Capital (₦)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={r.initialInvestment}
                              onChange={(e) =>
                                updateRow(r.partnerId, { initialInvestment: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#0F3D24]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Profit Share %
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={r.profitSharePercentage}
                              onChange={(e) =>
                                updateRow(r.partnerId, { profitSharePercentage: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Loss Share %
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              value={r.lossSharePercentage}
                              onChange={(e) =>
                                updateRow(r.partnerId, { lossSharePercentage: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                              Batch Pool %
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              step="1"
                              value={r.batchAllocationPercentage}
                              onChange={(e) =>
                                updateRow(r.partnerId, {
                                  batchAllocationPercentage: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#0F3D24]"
                            />
                          </div>
                          <label className="flex items-center gap-2 pt-4 text-xs font-semibold text-[#0F3D24] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={r.autoSyncBatch}
                              onChange={(e) =>
                                updateRow(r.partnerId, { autoSyncBatch: e.target.checked })
                              }
                              className="h-4 w-4 accent-[#0F3D24]"
                            />
                            <span>Auto-Sync</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {errorMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800">
                  {errorMsg}
                </div>
              )}
              {savedMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  {savedMsg}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-[#FAF9F6] px-6 py-3.5 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#3F8F3F]" />
            <span>Calculations sync live whenever batch revenue or expenses change.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              Close
            </button>
            <button
              type="button"
              disabled={saving || overAllocated || rows.length === 0 || !selectedBatchId}
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#165232] disabled:opacity-50 transition"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              {saving ? "Calculating & Syncing..." : "Save & Calculate All Allocations"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
