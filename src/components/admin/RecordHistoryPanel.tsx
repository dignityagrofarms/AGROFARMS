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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th>Date</th>
                <th>Record / revision</th>
                <th>Submitted by</th>
                <th>Action / reviewer</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.rows.map((event) => {
                const record = event.after_data || event.before_data || {};
                return (
                  <tr key={event.id} className="border-t">
                    <td className="p-2">
                      {new Date(event.created_at).toLocaleString("en-GB", {
                        timeZone: "Africa/Lagos",
                      })}
                    </td>
                    <td>
                      {event.source_table.replaceAll("_", " ")} · r{event.revision}
                      <br />
                      <span className="font-mono">{event.source_id}</span>
                    </td>
                    <td>{event.recorded_by || "Unknown legacy submitter"}</td>
                    <td>
                      {event.action}
                      <br />
                      {event.actor_name || "Legacy / system — reviewer unknown"}
                      {event.actor_role ? ` (${event.actor_role})` : ""}
                    </td>
                    <td>
                      {String(
                        record.description ||
                          record.item_description ||
                          record.activity_type ||
                          record.notes ||
                          "",
                      )}
                      <br />
                      {String(record.rejection_reason || "")}
                      <details>
                        <summary>View saved changes</summary>
                        <pre className="max-w-md max-h-60 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(
                            { before: event.before_data, after: event.after_data },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
          Page {page + 1} · {query.data?.total || 0} events
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
