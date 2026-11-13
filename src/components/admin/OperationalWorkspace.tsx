import { completedBatchWeeks } from "@/lib/batch-age";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminListBatches,
  adminCreateFinancial,
  adminListMySubmissions,
} from "@/lib/farm.functions";
import { adminOperationalOrders } from "@/lib/financial-access.functions";
import { adminUpdateOrder, type AdminRole } from "@/lib/orders.functions";
import { DailyActivitiesPanel } from "./FarmManagementPanels";
import { StaffTasksPanel } from "./StaffTasksPanel";
export function OperationalWorkspace({
  passcode,
  role,
  username,
  onSignOut,
}: {
  passcode: string;
  role: AdminRole;
  username: string;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState("entry"),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const list = useServerFn(adminListBatches),
    create = useServerFn(adminCreateFinancial),
    my = useServerFn(adminListMySubmissions),
    orders = useServerFn(adminOperationalOrders),
    updateOrder = useServerFn(adminUpdateOrder),
    cache = useQueryClient();
  const batches = useQuery({
    queryKey: ["operational-batches", passcode],
    queryFn: () => list({ data: { passcode } }),
  });
  const history = useQuery({
    queryKey: ["my-submissions", passcode],
    queryFn: () => my({ data: { passcode } }),
    refetchInterval: 20000,
  });
  const delivery = useQuery({
    queryKey: ["operational-orders", passcode],
    queryFn: () => orders({ data: { passcode } }),
    enabled: tab === "orders",
    refetchInterval: 20000,
  });
  const changeOrder = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
    }) => updateOrder({ data: { passcode, id, status } }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["operational-orders"] }),
  });
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const [form, setForm] = useState({
    batchId: "",
    type: "expense",
    category: "Feed",
    amount: "",
    amountPaid: "",
    partyName: "",
    dueDate: "",
    description: "",
    paymentMethod: "Cash",
    transactionDate: new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
    birdsSold: "",
    feedBags: "",
    feedBrand: "",
    feedKgPerBag: "25",
  });
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await create({
        data: {
          passcode,
          batchId: form.batchId,
          type: form.type as "income" | "expense",
          category: form.category,
          amount: Number(form.amount),
          amountPaid: form.amountPaid === "" ? Number(form.amount) : Number(form.amountPaid),
          partyName: form.partyName || null,
          dueDate: form.dueDate || null,
          description: form.description,
          paymentMethod: form.paymentMethod,
          transactionDate: form.transactionDate,
          ...(form.type === "income" ? { birdsSold: Number(form.birdsSold) || 0 } : {}),
          ...(form.category.trim().toLowerCase() === "feed" && form.type === "expense"
            ? {
                feedBags: Number(form.feedBags) || null,
                feedBrand: form.feedBrand || null,
                feedKgPerBag: Number(form.feedKgPerBag) || 25,
              }
            : {}),
        },
      });
      setMessage("Submitted for owner approval.");
      setForm((f) => ({
        ...f,
        amount: "",
        amountPaid: "",
        partyName: "",
        dueDate: "",
        description: "",
        birdsSold: "",
        feedBags: "",
      }));
      cache.invalidateQueries({ queryKey: ["my-submissions"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-8">
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-emerald-950">Farm operations</h1>
          <p className="text-sm">
            Signed in as {username} · Financial reports are restricted by the Farm Owner.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/" className="min-h-11 py-3 underline">
            Website
          </Link>
          <button onClick={onSignOut} className="min-h-11 rounded-lg border px-4">
            Sign out
          </button>
        </div>
      </header>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="font-bold">Batch stock</h2>
        {batches.isLoading && <p>Loading stock…</p>}
        {batches.error && <p role="alert">{batches.error.message}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {[
                  "Batch",
                  "Initial birds",
                  "Mortality",
                  "Birds sold",
                  "Remaining",
                  "Completed weeks",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.data?.map((b) => (
                <tr className="border-t" key={b.id}>
                  <td className="p-2">{b.batchName}</td>
                  <td className="p-2">{b.initialHeadcount}</td>
                  <td className="p-2">{b.totalMortality ?? 0}</td>
                  <td className="p-2">{b.totalBirdsSold ?? 0}</td>
                  <td className="p-2">{b.currentHeadcount}</td>
                  <td className="p-2">{completedBatchWeeks(b.startDate) ?? "Unavailable"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <nav className="flex flex-wrap gap-2">
        {[
          ["entry", "Sales & expenses"],
          ["activities", "Daily farm reports"],
          ["orders", "Order fulfilment"],
          ["tasks", "Tasks"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-h-11 rounded-lg border px-4 ${tab === key ? "bg-emerald-950 text-white" : "bg-white"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "entry" && (
        <>
          <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-4">
            <h2 className="font-bold">Submit a sale or expense</h2>
            <p className="text-sm">
              Enter amounts for this record only. Your entry remains pending until the owner reviews
              it.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Batch
                <select
                  required
                  value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  className="block min-h-11 w-full rounded-lg border p-2"
                >
                  <option value="">Select batch…</option>
                  {batches.data
                    ?.filter((b) => b.status === "active")
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchName}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                      category: e.target.value === "income" ? "Bird Sales" : "Feed",
                    })
                  }
                  className="block min-h-11 w-full rounded-lg border p-2"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Sale / income</option>
                </select>
              </label>
              {(
                [
                  ["category", "Category", "text"],
                  ["amount", "Amount (NGN)", "number"],
                  ["description", "Description", "text"],
                  ["transactionDate", "Date", "date"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key}>
                  {label}
                  <input
                    required
                    min={type === "number" ? "0.01" : undefined}
                    step={type === "number" ? "0.01" : undefined}
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="block min-h-11 w-full rounded-lg border p-2"
                  />
                </label>
              ))}
              <label>
                Amount paid / received (NGN, leave blank if paid in full)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={Number(form.amount) || undefined}
                  value={form.amountPaid}
                  onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                  className="block min-h-11 w-full rounded-lg border p-2"
                />
              </label>
              {form.amountPaid !== "" && Number(form.amountPaid) < Number(form.amount) && (
                <>
                  <label>
                    Customer / supplier name
                    <input
                      required
                      value={form.partyName}
                      onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                      className="block min-h-11 w-full rounded-lg border p-2"
                    />
                  </label>
                  <label>
                    Balance due date
                    <input
                      required
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="block min-h-11 w-full rounded-lg border p-2"
                    />
                  </label>
                </>
              )}
              <label>
                Payment method
                <select
                  className="block min-h-11 w-full rounded-lg border p-2"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                >
                  {["Cash", "Bank Transfer", "POS"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {form.type === "income" && (
                <label>
                  Birds sold
                  <input
                    required={form.category === "Bird Sales"}
                    type="number"
                    min="0"
                    step="1"
                    value={form.birdsSold}
                    onChange={(e) => setForm({ ...form, birdsSold: e.target.value })}
                    className="block min-h-11 w-full rounded-lg border p-2"
                  />
                </label>
              )}
              {form.category.trim().toLowerCase() === "feed" &&
                form.type === "expense" &&
                (
                  [
                    ["feedBags", "Bags purchased", "number"],
                    ["feedBrand", "Feed brand", "text"],
                    ["feedKgPerBag", "Kilograms per bag", "number"],
                  ] as const
                ).map(([key, label, type]) => (
                  <label key={key}>
                    {label}
                    <input
                      required
                      type={type}
                      min={type === "number" ? "0.01" : undefined}
                      step={type === "number" ? "any" : undefined}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="block min-h-11 w-full rounded-lg border p-2"
                    />
                  </label>
                ))}
            </div>
            <button
              disabled={saving}
              className="min-h-11 rounded-lg bg-emerald-950 px-4 text-white"
            >
              {saving ? "Saving…" : "Submit for approval"}
            </button>
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
          </form>
          <section className="space-y-3 rounded-2xl border bg-white p-4">
            <h2 className="font-bold">My submissions</h2>
            <div className="flex flex-wrap gap-3">
              <label>
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="block min-h-11 rounded-lg border p-2"
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="block min-h-11 rounded-lg border p-2"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {["Date", "Record", "Amount you entered", "Status"].map((h) => (
                      <th key={h} className="p-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.data
                    ?.filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
                    .map((r) => (
                      <tr key={r.targetType + r.id} className="border-t">
                        <td className="p-2">{r.date}</td>
                        <td className="p-2">{r.title}</td>
                        <td className="p-2">
                          {r.amount == null
                            ? "—"
                            : r.amount.toLocaleString("en-NG", {
                                style: "currency",
                                currency: "NGN",
                              })}
                        </td>
                        <td className="p-2">
                          {r.approvalStatus === "pending_approval"
                            ? "Pending"
                            : r.approvalStatus === "approved"
                              ? "Approved"
                              : r.approvalStatus === "flagged"
                                ? "Flagged"
                                : "Rejected"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {history.error && <p role="alert">{history.error.message}</p>}
          </section>
        </>
      )}
      {tab === "activities" && (
        <DailyActivitiesPanel passcode={passcode} role={role} username={username} />
      )}
      {tab === "tasks" && (
        <StaffTasksPanel hideFinancials passcode={passcode} role={role} username={username} />
      )}
      {tab === "orders" && (
        <section className="space-y-3">
          <h2 className="font-bold">Order fulfilment — prices and receipts hidden</h2>
          {delivery.error && <p role="alert">{delivery.error.message}</p>}
          {changeOrder.error && <p role="alert">{changeOrder.error.message}</p>}
          {delivery.data?.map((o) => (
            <article key={o.id} className="space-y-2 rounded-xl border bg-white p-4">
              <h3 className="font-bold">
                {o.code} · {o.customerName}
              </h3>
              <p>
                {o.phone} · {o.address}
              </p>
              <ul>
                {o.items.map((i, index) => (
                  <li key={index}>
                    {i.quantity} × {i.product} {i.option}
                  </li>
                ))}
              </ul>
              <label>
                Fulfilment status
                <select
                  disabled={changeOrder.isPending}
                  className="ml-2 min-h-11 rounded-lg border p-2"
                  value={o.status}
                  onChange={(e) =>
                    changeOrder.mutate({
                      id: o.id,
                      status: e.target.value as
                        "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled",
                    })
                  }
                >
                  {["received", "preparing", "out_for_delivery", "delivered", "cancelled"].map(
                    (s) => (
                      <option value={s} key={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
