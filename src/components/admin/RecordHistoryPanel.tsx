import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecordHistory } from "@/lib/audit.functions";
export function RecordHistoryPanel({
  passcode,
  owner = false,
}: {
  passcode: string;
  owner?: boolean;
}) {
  const list = useServerFn(listRecordHistory);
  const [page, setPage] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [status, setStatus] = useState<
    "all" | "approved" | "rejected" | "pending_approval" | "flagged"
  >("all");
  const query = useQuery({
    queryKey: ["record-history", passcode, page, from, to, status, submitter],
    queryFn: () =>
      list({
        data: {
          passcode,
          page,
          from: from || undefined,
          to: to || undefined,
          status,
          submitter: submitter || undefined,
        },
      }),
    refetchInterval: 20000,
  });
  return (
    <section className="my-5 rounded-2xl border bg-white p-4 space-y-3">
      <h3 className="font-bold">
        {owner ? "Permanent record and decision history" : "My permanent submission history"}
      </h3>
      <p className="text-xs text-slate-600">
        Creation, changes and review decisions remain here after a record is revised or removed.
        Dates use Africa/Lagos. Earlier decisions may have no recorded reviewer.
      </p>
      <div className="flex flex-wrap gap-3 text-sm">
        <label>
          From{" "}
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          To{" "}
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="History status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status);
            setPage(0);
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
        {owner && (
          <input
            aria-label="Submitter username"
            value={submitter}
            onChange={(e) => {
              setSubmitter(e.target.value);
              setPage(0);
            }}
            placeholder="Submitter username"
            className="border rounded px-2"
          />
        )}
      </div>
      {query.error && (
        <p role="alert" className="text-red-700">
          {query.error.message}
        </p>
      )}
      {query.isLoading ? (
        <p>Loading history…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-900">
            {query.data?.total ?? 0} saved history entries matching these filters
          </p>
          {query.data?.rows.map((event) => {
            const record = event.after_data || event.before_data || {};
            const labels: Record<string, string> = {
              farm_financials: "Financial record",
              farm_activities: "Daily farm report",
              contact_transactions: "Customer / supplier transaction",
              farm_financial_payments: "Follow-up payment",
            };
            const actions: Record<string, string> = {
              insert: "Submitted",
              update: "Updated",
              delete: "Removed",
              approved: "Approved",
              rejected: "Rejected",
              flagged: "Returned for correction",
              pending_approval: "Submitted for approval",
              pending: "Awaiting approval",
              legacy_snapshot: "Earlier record retained",
            };
            const statuses: Record<string, string> = {
              approved: "Approved",
              pending: "Pending review",
              pending_approval: "Pending review",
              flagged: "Needs correction",
              rejected: "Rejected",
            };
            const maintenance = event.actor_name?.includes("maintenance");
            const person = record.recorded_by_name || event.recorded_by || "Submitter not recorded";
            const fields: Array<[string, string]> = [
              ["amount", "Amount"],
              ["amount_paid", "Amount paid"],
              ["total_amount", "Total amount"],
              ["mortality_count", "Birds lost"],
              ["birds_sold", "Birds sold"],
              ["feed_bags", "Feed bags"],
              ["feed_consumed_kg", "Feed used (kg)"],
              ["activity_date", "Report date"],
              ["transaction_date", "Transaction date"],
              ["payment_date", "Payment date"],
              ["description", "Description"],
              ["item_description", "Description"],
              ["rejection_reason", "Review note"],
            ];
            const value = (key: string, raw: unknown) =>
              raw === null || raw === undefined
                ? "Not recorded"
                : key.includes("amount")
                  ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
                      Number(raw),
                    )
                  : String(raw ?? "Not recorded");
            return (
              <article
                key={event.id}
                className="rounded-xl border border-slate-200 p-4 text-sm space-y-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-emerald-950">
                      {String(
                        record.description ||
                          record.item_description ||
                          record.activity_type ||
                          labels[event.source_table] ||
                          "Farm record",
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {labels[event.source_table] || "Farm record"} ·{" "}
                      {new Date(event.created_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Lagos",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                    {statuses[String(record.approval_status)] ||
                      (event.action === "delete" ? "Removed" : "Status not recorded")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <p>
                    <span className="text-slate-500">Recorded by: </span>
                    {String(person)}
                  </p>
                  <p>
                    <span className="text-slate-500">Action: </span>
                    {actions[event.action] || "Record changed"}
                  </p>
                  <p>
                    <span className="text-slate-500">Reviewed / updated by: </span>
                    {maintenance
                      ? "System maintenance (owner authorised)"
                      : event.actor_name || "Not recorded for this earlier entry"}
                  </p>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {fields
                    .filter(
                      ([key]) =>
                        record[key] !== undefined &&
                        record[key] !== null &&
                        !["description", "item_description", "rejection_reason"].includes(key),
                    )
                    .map(([key, label]) => (
                      <div key={key}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="font-medium">{value(key, record[key])}</dd>
                      </div>
                    ))}
                </dl>
                {record.rejection_reason && (
                  <p className="rounded bg-amber-50 p-2">
                    Review note: {String(record.rejection_reason)}
                  </p>
                )}
                {event.before_data && event.after_data && (
                  <details>
                    <summary className="cursor-pointer font-semibold text-emerald-800">
                      See what changed
                    </summary>
                    <dl className="mt-2 space-y-2">
                      {fields
                        .filter(
                          ([key]) =>
                            JSON.stringify(event.before_data?.[key]) !==
                            JSON.stringify(event.after_data?.[key]),
                        )
                        .map(([key, label]) => (
                          <div key={key}>
                            <dt className="font-semibold">{label}</dt>
                            <dd>
                              Previously: {value(key, event.before_data?.[key])} → Now:{" "}
                              {value(key, event.after_data?.[key])}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </details>
                )}
              </article>
            );
          })}
          {!query.data?.rows.length && !query.error && (
            <p className="py-3">No history matches these filters.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} · {query.data?.total || 0} saved history entries
        </span>
        <button
          disabled={!query.data || (page + 1) * 50 >= query.data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
