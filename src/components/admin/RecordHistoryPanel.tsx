import { adminApproveStaffRecord, adminDeleteRejectedRecord } from "@/lib/farm.functions";
import { Fragment, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecordHistory, getSubmissionChanges, type HistoryEvent } from "@/lib/audit.functions";
const labels: Record<string, string> = {
  farm_financials: "Financial record",
  farm_activities: "Farm report",
  contact_transactions: "Customer / supplier",
  farm_financial_payments: "Payment",
};
const statuses: Record<string, string> = {
  approved: "Approved",
  pending: "Pending review",
  pending_approval: "Pending review",
  flagged: "Needs correction",
  rejected: "Rejected",
  removed: "Removed",
};
const fields: Record<string, string> = {
  amount: "Amount",
  amount_paid: "Amount paid",
  total_amount: "Total amount",
  birds_sold: "Birds sold",
  mortality_count: "Birds lost",
  feed_bags: "Feed bags",
  feed_consumed_kg: "Feed used (kg)",
  description: "Description",
  item_description: "Description",
  rejection_reason: "Review note",
  approval_status: "Status",
};
function display(key: string, value: unknown): string {
  if (value === undefined || value === null) return "Not recorded";
  if (key === "approval_status") return statuses[String(value)] || "Not recorded";
  return key.includes("amount")
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(value))
    : String(value);
}
function Changes({
  passcode,
  event,
  owner,
}: {
  passcode: string;
  event: HistoryEvent;
  owner: boolean;
}) {
  const approve = useServerFn(adminApproveStaffRecord);
  const remove = useServerFn(adminDeleteRejectedRecord);
  const cache = useQueryClient();
  const action = useMutation({
    mutationFn: async (mode: "approve" | "remove") => {
      const targetType = (
        {
          farm_financials: "financial",
          farm_activities: "activity",
          contact_transactions: "contact_tx",
          farm_financial_payments: "fin_payment",
        } as const
      )[
        event.source_table as
          "farm_financials" | "farm_activities" | "contact_transactions" | "farm_financial_payments"
      ];
      const input = { data: { passcode, id: event.source_id, targetType } };
      if (mode === "approve") await approve(input);
      else await remove(input);
    },
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ["record-history"] });
      cache.invalidateQueries({ queryKey: ["submission-changes"] });
      cache.invalidateQueries({ queryKey: ["pending-approvals"] });
      cache.invalidateQueries({ queryKey: ["pending-approvals-count"] });
      for (const key of [
        "farm-financials",
        "farm-batches",
        "batch-report",
        "special-contacts",
        "debtors-creditors",
        "my-submissions",
      ])
        cache.invalidateQueries({ queryKey: [key] });
    },
  });
  const load = useServerFn(getSubmissionChanges);
  const query = useQuery({
    queryKey: ["submission-changes", passcode, event.source_table, event.source_id],
    queryFn: () =>
      load({
        data: {
          passcode,
          sourceId: event.source_id,
          sourceTable: event.source_table as
            | "farm_financials"
            | "farm_activities"
            | "contact_transactions"
            | "farm_financial_payments",
        },
      }),
  });
  return (
    <div className="space-y-3 p-3 text-sm">
      <h4 className="font-semibold">Saved changes</h4>
      {owner && event.current_status === "rejected" && (
        <div className="flex flex-wrap gap-2">
          <button
            disabled={action.isPending}
            className="min-h-11 rounded-lg bg-emerald-900 px-3 text-white disabled:opacity-50"
            onClick={() => {
              if (
                window.confirm(
                  "Approve this rejected submission and restore it to the farm records?",
                )
              )
                action.mutate("approve");
            }}
          >
            Re-approve
          </button>
          <button
            disabled={action.isPending}
            className="min-h-11 rounded-lg border border-red-300 px-3 text-red-700 disabled:opacity-50"
            onClick={() => {
              if (
                window.confirm(
                  "Remove this rejected record? Its saved history will remain available.",
                )
              )
                action.mutate("remove");
            }}
          >
            Remove rejected record
          </button>
        </div>
      )}
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error.message}
        </p>
      )}

      {query.isLoading && <p>Loading changes…</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {query.data?.map((change) => (
        <div key={change.id} className="border-l-2 border-emerald-200 pl-3">
          <p className="font-medium">
            {new Date(change.created_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} ·{" "}
            {change.action === "legacy_snapshot"
              ? "Earlier record retained"
              : change.action === "delete"
                ? "Record removed"
                : statuses[change.action] || "Record updated"}
          </p>
          <p className="text-xs text-slate-500">
            {change.actor_name?.includes("maintenance")
              ? "Owner-authorised system maintenance"
              : change.actor_name || "Reviewer not recorded for this earlier entry"}
          </p>
          {Object.entries(fields)
            .filter(([key]) =>
              change.before_data
                ? JSON.stringify(change.before_data[key]) !==
                  JSON.stringify(change.after_data?.[key])
                : change.after_data?.[key] != null,
            )
            .map(([key, label]) => (
              <p key={key}>
                {label}: {change.before_data ? `${display(key, change.before_data[key])} → ` : ""}
                {display(key, (change.after_data || change.before_data)?.[key])}
              </p>
            ))}
        </div>
      ))}
    </div>
  );
}
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
    "all" | "approved" | "rejected" | "pending_approval" | "flagged" | "removed"
  >("all");
  const [expanded, setExpanded] = useState<string | null>(null);
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
    <section className="min-w-0 rounded-2xl border bg-white p-3 sm:p-5 space-y-4">
      <h3 className="font-bold text-emerald-950">
        {owner ? "Submission history" : "My submission history"}
      </h3>
      <p className="text-xs text-slate-600">
        One row per record, showing its latest status. Open details to see earlier changes. Dates
        use Africa/Lagos.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <label className="min-w-0">
          From
          <input
            className="block min-h-11 w-full min-w-0 rounded-lg border p-2"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="min-w-0">
          To
          <input
            className="block min-h-11 w-full min-w-0 rounded-lg border p-2"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Status
          <select
            aria-label="History status"
            className="block min-h-11 w-full rounded-lg border p-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending_approval">Pending review</option>
            <option value="flagged">Needs correction</option>
            <option value="removed">Removed</option>
          </select>
        </label>
        {owner && (
          <label>
            Recorded by
            <input
              aria-label="Submitter username"
              className="block min-h-11 w-full rounded-lg border p-2"
              placeholder="Staff username"
              value={submitter}
              onChange={(e) => {
                setSubmitter(e.target.value);
                setPage(0);
              }}
            />
          </label>
        )}
      </div>
      {query.error ? (
        <p role="alert" className="text-red-700">
          {query.error.message}
        </p>
      ) : query.isLoading ? (
        <p role="status">Loading history…</p>
      ) : (
        <>
          <p className="text-sm font-semibold">
            {query.data?.total ?? 0} history records matching these filters
          </p>
          <p className="text-xs text-slate-500 sm:hidden">
            Swipe the table sideways to see all columns.
          </p>
          <div
            role="region"
            aria-label="Submission history table"
            tabIndex={0}
            className="max-w-full overflow-x-auto rounded-xl border"
          >
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-emerald-50">
                <tr>
                  {["Date", "Record", "Submitted by", "Status", "Actions"].map((label) => (
                    <th key={label} className="p-3">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data?.rows.map((event) => {
                  const record = event.after_data || event.before_data || {};
                  const key = event.source_table + event.source_id;
                  const date =
                    record.transaction_date ||
                    record.activity_date ||
                    record.payment_date ||
                    record.created_at ||
                    event.created_at;
                  return (
                    <Fragment key={key}>
                      <tr className="border-t align-top">
                        <td className="p-3 whitespace-nowrap">
                          {new Date(String(date)).toLocaleDateString("en-GB", {
                            timeZone: "Africa/Lagos",
                          })}
                        </td>
                        <td className="p-3 min-w-48 max-w-80 break-words">
                          <p className="font-semibold">
                            {String(
                              record.description ||
                                record.item_description ||
                                record.activity_type ||
                                labels[event.source_table],
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{labels[event.source_table]}</p>
                          {record.amount != null || record.total_amount != null ? (
                            <p>{display("amount", record.amount ?? record.total_amount)}</p>
                          ) : null}
                        </td>
                        <td className="p-3">
                          {String(record.recorded_by_name || event.recorded_by || "Not recorded")}
                        </td>
                        <td className="p-3">
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                            {statuses[event.current_status || String(record.approval_status)] ||
                              "Not recorded"}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            aria-expanded={expanded === key}
                            onClick={() => setExpanded(expanded === key ? null : key)}
                            className="min-h-11 rounded-lg border px-3 text-emerald-900"
                          >
                            {expanded === key ? "Close details" : "View details"}
                          </button>
                        </td>
                      </tr>
                      {expanded === key && (
                        <tr>
                          <td colSpan={5}>
                            <Changes passcode={passcode} event={event} owner={owner} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!query.data?.rows.length && <p>No history matches these filters.</p>}
        </>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          className="min-h-11 rounded-lg border px-3 disabled:opacity-40"
          disabled={page === 0 || query.isLoading}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className="min-h-11 rounded-lg border px-3 disabled:opacity-40"
          disabled={!query.data || query.isLoading || (page + 1) * 25 >= query.data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
