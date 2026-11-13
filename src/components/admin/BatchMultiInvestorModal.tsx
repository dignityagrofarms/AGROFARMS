import { UndoPartnerAllocation } from "./UndoPartnerAllocation";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminGetBatchInvestors,
  adminConfirmHistoricalBirds,
  adminAllocateBatchInvestors,
  type FarmPartner,
} from "@/lib/partners.functions";
import type { FarmBatch } from "@/lib/farm.functions";
import {
  allocationFromBirds,
  allocationFromInvestment,
  weightedProfitShare,
} from "@/lib/batch-allocation";
import { computeSettlement } from "@/lib/partner-settlement";
type Row = {
  partnerId: string;
  fullName: string;
  mode: "birds" | "investment";
  value: string;
  profit: string;
  loss: string;
};
const money = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const confirmHistory = useServerFn(adminConfirmHistoricalBirds);
  const [historicalBirds, setHistoricalBirds] = useState<Record<string, string>>({});
  const get = useServerFn(adminGetBatchInvestors),
    save = useServerFn(adminAllocateBatchInvestors),
    cache = useQueryClient();
  const [batchId, setBatchId] = useState(
    initialBatchId || batches.find((b) => b.status === "active")?.id || "",
  );
  const [funding, setFunding] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["batch-investors", passcode, batchId],
    queryFn: () => get({ data: { passcode, batchId } }),
    enabled: !!batchId,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!query.data) return;
    setFunding(query.data.fundingPerBird == null ? "" : String(query.data.fundingPerBird));
    setRows(
      query.data.investors.map((i) => ({
        partnerId: i.partnerId,
        fullName: i.fullName,
        mode: i.allocatedBirds ? "birds" : "investment",
        value: String(i.allocatedBirds || i.initialInvestment || ""),
        profit: String(i.profitSharePercentage),
        loss: String(i.lossSharePercentage),
      })),
    );
    setReviewed(false);
  }, [query.data]);
  const initial = query.data?.initialBirds || 0,
    rate = Number(funding);
  const calculated = rows.map((row) => {
    try {
      const a =
        row.mode === "birds"
          ? allocationFromBirds(Number(row.value), initial, rate)
          : allocationFromInvestment(Number(row.value), initial, rate);
      const profit = Number(row.profit),
        loss = Number(row.loss);
      if (
        !Number.isFinite(profit) ||
        !Number.isFinite(loss) ||
        profit < 0 ||
        profit > 100 ||
        loss < 0 ||
        loss > 100
      )
        throw new Error("Profit and loss shares must be between 0 and 100");
      const previous = query.data?.investors.find((i) => i.partnerId === row.partnerId);
      const settlement = computeSettlement(
        {
          initialInvestment: a.investment,
          profitSharePercentage: profit,
          lossSharePercentage: loss,
        },
        [
          { type: "income", amount: ((query.data?.totalIncome || 0) * a.ownership) / 100 },
          { type: "expense", amount: ((query.data?.totalExpense || 0) * a.ownership) / 100 },
          { type: "payout", amount: previous?.settlement.paidOut || 0 },
        ],
      );
      return { row, allocation: a, settlement, error: "" };
    } catch (err) {
      return {
        row,
        allocation: null,
        settlement: null,
        error: err instanceof Error ? err.message : "Invalid allocation",
      };
    }
  });
  const assigned = calculated.reduce(
    (n, r) => n + (r.allocation?.birds || 0),
    query.data?.reservedBirds || 0,
  );
  const ownershipProfit = weightedProfitShare(
    calculated.map((r) => ({
      ownership: r.allocation?.ownership || 0,
      profitShare: Number(r.row.profit) || 0,
    })),
  );
  const invalid =
    !rows.length ||
    calculated.some((r) => !r.allocation) ||
    assigned > initial ||
    query.data?.unresolvedHistoricalAllocation ||
    query.data?.batchStatus !== "active";
  function change(id: string, patch: Partial<Row>) {
    setRows((old) => old.map((r) => (r.partnerId === id ? { ...r, ...patch } : r)));
    setReviewed(false);
    setMessage("");
  }
  async function commit() {
    if (invalid || !reviewed || !query.data) return;
    setBusy(true);
    setError("");
    try {
      await save({
        data: {
          passcode,
          batchId,
          fundingPerBird: rate,
          revision: query.data.allocationRevision,
          allocations: calculated.map((r) => ({
            partnerId: r.row.partnerId,
            birds: r.allocation!.birds,
            profitSharePercentage: Number(r.row.profit),
            lossSharePercentage: Number(r.row.loss),
          })),
        },
      });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["batch-investors"] }),
        cache.invalidateQueries({ queryKey: ["admin-partners"] }),
        cache.invalidateQueries({ queryKey: ["admin-partner-detail"] }),
        cache.invalidateQueries({ queryKey: ["farm-batches"] }),
      ]);
      setMessage("Allocations saved. Partner records and approved ledgers are synchronized.");
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save allocations");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="allocation-title"
    >
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 bg-emerald-950 p-5 text-white">
          <div>
            <h2 id="allocation-title" className="text-xl font-bold">
              Allocate partners to a batch
            </h2>
            <p className="text-sm">
              Enter birds or investment once. Ownership and records update automatically.
            </p>
          </div>
          <button
            className="min-h-11 min-w-11"
            onClick={onClose}
            aria-label="Close allocation form"
          >
            ✕
          </button>
        </header>
        <div className="min-w-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <label className="block text-sm font-semibold">
            Farm batch
            <select
              className="mt-1 min-h-11 w-full rounded-lg border p-2"
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value);
                setReviewed(false);
                setError("");
                setMessage("");
              }}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchName} · {b.initialHeadcount} initial birds · {b.status}
                </option>
              ))}
            </select>
          </label>
          {query.isLoading && <p>Loading allocations…</p>}
          {query.error && <p role="alert">{query.error.message}</p>}
          {query.data && (
            <>
              <label className="block text-sm font-semibold">
                Funding per bird (NGN)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-1 min-h-11 w-full rounded-lg border p-2"
                  value={funding}
                  onChange={(e) => {
                    setFunding(e.target.value);
                    setReviewed(false);
                  }}
                />
              </label>
              <p className="text-sm">
                Original batch: <strong>{initial} birds</strong> · Total funding:{" "}
                <strong>{money((rate || 0) * initial)}</strong>. Ownership stays fixed as birds are
                sold or lost.
              </p>
              {query.data.investors.some((i) => !i.allocatedBirds) && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm">
                  Earlier manual allocations need confirmation. Enter the actual funding rate and
                  review each partner before saving. Nothing has been changed automatically.
                </p>
              )}
              {query.data.unresolvedHistoricalAllocation && (
                <p role="alert">
                  A closed or inactive legacy allocation needs reconciliation before this batch can
                  be reallocated.
                </p>
              )}
              {query.data.historicalAllocations?.map((h) => (
                <section
                  key={h.partnerId}
                  className="space-y-2 rounded-xl border border-amber-300 p-3"
                >
                  <h3 className="font-semibold">Confirm historical birds — {h.fullName}</h3>
                  <p className="text-sm">
                    {h.cycleName} · Recorded capital {money(h.investment)}. This reserves the
                    historical birds without changing capital, settled figures, ledgers or signed
                    agreements.
                  </p>
                  <label className="block text-sm">
                    Original whole birds
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={historicalBirds[h.partnerId] || ""}
                      onChange={(e) =>
                        setHistoricalBirds({ ...historicalBirds, [h.partnerId]: e.target.value })
                      }
                      className="block min-h-11 w-full rounded-lg border p-2"
                    />
                  </label>
                  <button
                    disabled={busy || !historicalBirds[h.partnerId]}
                    className="min-h-11 rounded-lg border px-4"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Confirm these original historical birds? Existing settled money will remain unchanged.",
                        )
                      )
                        return;
                      setBusy(true);
                      setError("");
                      try {
                        await confirmHistory({
                          data: {
                            passcode,
                            batchId,
                            partnerId: h.partnerId,
                            birds: Number(historicalBirds[h.partnerId]),
                            revision: query.data!.allocationRevision,
                          },
                        });
                        await query.refetch();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not confirm historical allocation",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Confirm historical birds
                  </button>
                </section>
              ))}
              <label className="block text-sm font-semibold">
                Add partner
                <select
                  className="mt-1 min-h-11 w-full rounded-lg border p-2"
                  value=""
                  onChange={(e) => {
                    const p = partners.find((p) => p.id === e.target.value);
                    if (p) {
                      setRows((r) => [
                        ...r,
                        {
                          partnerId: p.id,
                          fullName: p.fullName,
                          mode: "investment",
                          value: String(p.initialInvestment || ""),
                          profit: String(p.profitSharePercentage),
                          loss: String(p.lossSharePercentage),
                        },
                      ]);
                      setReviewed(false);
                    }
                  }}
                >
                  <option value="">Choose an active partner…</option>
                  {partners
                    .filter(
                      (p) =>
                        p.active &&
                        p.cycleStatus === "open" &&
                        (!p.batchId || p.batchId === batchId) &&
                        !rows.some((r) => r.partnerId === p.id),
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                </select>
              </label>
              {calculated.map(({ row, allocation, settlement, error: rowError }) => (
                <section className="space-y-3 rounded-xl border p-4" key={row.partnerId}>
                  <div className="flex justify-between gap-2">
                    <h3 className="font-bold">{row.fullName}</h3>
                    {query.data!.investors.some((i) => i.partnerId === row.partnerId) && (
                      <UndoPartnerAllocation
                        passcode={passcode}
                        partnerId={row.partnerId}
                        onUndone={() => {
                          setMessage(
                            "The previous allocation details were restored. History was preserved.",
                          );
                          query.refetch();
                        }}
                      />
                    )}
                    {!query.data!.investors.some((i) => i.partnerId === row.partnerId) && (
                      <button
                        onClick={() => {
                          setRows((r) => r.filter((x) => x.partnerId !== row.partnerId));
                          setReviewed(false);
                        }}
                        className="min-h-11 text-sm text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Birds allocated
                      <input
                        aria-label={`Birds allocated to ${row.fullName}`}
                        type="number"
                        min="1"
                        step="1"
                        value={row.mode === "birds" ? row.value : allocation?.birds || ""}
                        onChange={(e) =>
                          change(row.partnerId, { mode: "birds", value: e.target.value })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border p-2"
                      />
                    </label>
                    <label className="text-sm">
                      Investment (NGN)
                      <input
                        aria-label={`Investment for ${row.fullName}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.mode === "investment" ? row.value : allocation?.investment || ""}
                        onChange={(e) =>
                          change(row.partnerId, { mode: "investment", value: e.target.value })
                        }
                        className="mt-1 min-h-11 w-full rounded-lg border p-2"
                      />
                    </label>
                    <label className="text-sm">
                      Partner’s share of profit (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.profit}
                        onChange={(e) => change(row.partnerId, { profit: e.target.value })}
                        className="mt-1 min-h-11 w-full rounded-lg border p-2"
                      />
                    </label>
                    <label className="text-sm">
                      Partner’s share of loss (%)
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.loss}
                        onChange={(e) => change(row.partnerId, { loss: e.target.value })}
                        className="mt-1 min-h-11 w-full rounded-lg border p-2"
                      />
                    </label>
                  </div>
                  {rowError ? (
                    <p role="alert" className="text-sm text-red-700">
                      {rowError}
                    </p>
                  ) : (
                    <>
                      <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold">
                        Ownership: {allocation!.ownership.toFixed(4)}% · {allocation!.birds} of{" "}
                        {initial} birds · Auto-sync enabled
                      </p>
                      <p className="text-xs">
                        Profit and loss percentages apply to this partner’s portion, not the whole
                        batch.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr>
                              <th className="p-2">Recalculation preview</th>
                              <th className="p-2">Current</th>
                              <th className="p-2">After saving</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="p-2">Capital</td>
                              <td className="p-2">
                                {money(
                                  query.data!.investors.find((i) => i.partnerId === row.partnerId)
                                    ?.initialInvestment || 0,
                                )}
                              </td>
                              <td className="p-2">{money(allocation!.investment)}</td>
                            </tr>
                            <tr>
                              <td className="p-2">Settlement due</td>
                              <td className="p-2">
                                {money(
                                  query.data!.investors.find((i) => i.partnerId === row.partnerId)
                                    ?.settlement.payoutDue || 0,
                                )}
                              </td>
                              <td className="p-2">{money(settlement!.payoutDue)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              ))}
              <div className="rounded-xl bg-slate-50 p-4 text-sm">
                <p>
                  Allocated / reserved: {assigned} birds · Available to the farm:{" "}
                  {initial - assigned}
                </p>
                <p>
                  Active investor entitlement: {ownershipProfit.toFixed(2)}% of batch profit ·
                  {(query.data.reservedBirds || 0) > 0
                    ? "Farm and settled allocations retain:"
                    : "Farm retains:"}{" "}
                  {(100 - ownershipProfit).toFixed(2)}%
                </p>
              </div>
              {assigned > initial && (
                <p role="alert" className="text-red-700">
                  Allocated birds exceed batch capacity.
                </p>
              )}
              <p className="text-xs">
                Saving reconciles approved batch entries. Existing signed agreements and
                closed-cycle settlements remain unchanged. Close a partner’s cycle before removing
                an existing allocation.
              </p>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I have reviewed the birds, investment, profit/loss terms and recalculation preview.
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-emerald-800">
              {message}
            </p>
          )}
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t p-4">
          <button className="min-h-11 rounded-lg border px-4" onClick={onClose}>
            Close
          </button>
          <button
            disabled={busy || !reviewed || !!invalid}
            onClick={commit}
            className="min-h-11 rounded-lg bg-emerald-950 px-4 text-white disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save allocations & sync records"}
          </button>
        </footer>
      </div>
    </div>
  );
}
