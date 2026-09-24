import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer, CheckCircle2, AlertTriangle } from "lucide-react";
import logo from "@/assets/logo.png";
import { getOrderReceipt } from "@/lib/orders.functions";

export const Route = createFileRoute("/receipt/$orderCode")({
  validateSearch: (search: Record<string, unknown>) => ({
    code:
      typeof search.code === "string" || typeof search.code === "number"
        ? String(search.code)
        : "",
  }),
  head: () => ({
    meta: [
      { title: "Receipt · Dignity Agro Farms" },
      { name: "description", content: "Download or print your Dignity Agro Farms order receipt." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Receipt · Dignity Agro Farms" },
      { property: "og:description", content: "Your Dignity Agro Farms order receipt." },
    ],
  }),
  component: ReceiptPage,
});

const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");

function ReceiptPage() {
  const { orderCode } = Route.useParams();
  const { code } = Route.useSearch();
  const fetchFn = useServerFn(getOrderReceipt);

  const query = useQuery({
    queryKey: ["receipt", orderCode, code],
    queryFn: () => fetchFn({ data: { orderCode, trackCode: code } }),
    enabled: !!code,
    retry: false,
  });

  if (!code) {
    return (
      <Shell>
        <p className="text-sm text-[#0F3D24]/70">
          This receipt link is missing your tracking code. Open it from the Track Your Order page.
        </p>
      </Shell>
    );
  }

  if (query.isLoading) return <Shell><p className="text-sm text-[#0F3D24]/60">Loading receipt…</p></Shell>;

  if (query.isError || !query.data) {
    return (
      <Shell>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{query.error instanceof Error ? query.error.message : "Could not load this receipt."}</span>
        </div>
      </Shell>
    );
  }

  const o = query.data.order;
  const paid = o.paymentStatus === "approved";
  const docTitle = paid ? "RECEIPT" : "INVOICE";
  const dateLine = paid && o.paymentApprovedAt
    ? `Paid ${new Date(o.paymentApprovedAt).toLocaleString()}`
    : `Issued ${new Date(o.createdAt).toLocaleString()}`;

  return (
    <Shell>
      <style>{`@media print{.no-print{display:none!important}body{background:#fff}.print-sheet{box-shadow:none!important;margin:0!important;padding:0!important;}}`}</style>

      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <a href="/track-order" className="text-sm font-semibold text-[#3F8F3F] hover:underline">&larr; Back to tracking</a>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c]"
        >
          <Printer size={16} /> Download / Print {paid ? "receipt" : "invoice"}
        </button>
      </div>

      <div className="print-sheet rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0F3D24]/10 pb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Dignity Agro Farms logo" className="h-14 w-14 rounded-full object-cover" />
            <div>
              <div className="text-lg font-semibold text-[#0F3D24]">Dignity Agro Farms Limited</div>
              <div className="text-xs text-[#0F3D24]/60">9 Oduobi Crescent, Ikenegbu, Owerri</div>
              <div className="text-xs text-[#0F3D24]/60">07083476366</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-wide text-[#0F3D24]">{docTitle}</div>
            <div className="font-mono text-sm font-semibold text-[#3F8F3F]">{o.orderCode}</div>
            <div className="text-xs text-[#0F3D24]/60">{dateLine}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Billed to</div>
            <div className="mt-1 text-sm font-semibold text-[#0F3D24]">{o.customerName}</div>
            <div className="text-sm text-[#0F3D24]/70">{o.phone}</div>
            <div className="text-sm text-[#0F3D24]/70">{o.address}</div>
            <div className="text-xs text-[#0F3D24]/60">{o.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri"}</div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#3F8F3F]">Payment</div>
            {paid ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#3F8F3F]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#0F3D24] ring-1 ring-[#3F8F3F]/40">
                <CheckCircle2 size={14} className="text-[#3F8F3F]" /> Payment confirmed
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-800 ring-1 ring-amber-300">
                Awaiting payment
              </div>
            )}
            <div className="mt-2 text-sm text-[#0F3D24]/70">Bank transfer · Moniepoint MFB</div>
            <div className="text-sm text-[#0F3D24]/70">4006179439 · Dignity Agro Farms Limited</div>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-[#0F3D24]/15 text-left text-xs uppercase tracking-widest text-[#0F3D24]/60">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it, i) => (
              <tr key={i} className="border-b border-[#0F3D24]/5">
                <td className="py-2 text-[#0F3D24]">{it.product} · {it.option}</td>
                <td className="py-2 text-center text-[#0F3D24]/70">{it.qty}</td>
                <td className="py-2 text-right text-[#0F3D24]/70">{naira(it.unitPrice)}</td>
                <td className="py-2 text-right font-medium text-[#0F3D24]">{naira(it.unitPrice * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
          <Row label="Subtotal" value={naira(o.subtotal)} />
          <Row label="Delivery" value={o.deliveryFee === 0 ? "FREE" : naira(o.deliveryFee)} />
          <div className="mt-2 flex justify-between border-t border-[#0F3D24]/15 pt-2 text-base font-semibold text-[#0F3D24]">
            <span>Total</span><span>{naira(o.total)}</span>
          </div>
        </div>

        {!paid && (
          <div className="mt-6 rounded-2xl bg-[#F7F5F0] p-4 text-xs text-[#0F3D24]/80 ring-1 ring-[#0F3D24]/10">
            <strong>Payment instructions:</strong> send {naira(o.total)} to Moniepoint MFB account <strong>4006179439</strong> (Dignity Agro Farms Limited) only,
            then tap "I have made payment" on your order page. Never send money to any other account.
          </div>
        )}

        <p className="mt-8 border-t border-[#0F3D24]/10 pt-4 text-center text-xs text-[#0F3D24]/60">
          Thank you for choosing Dignity Agro Farms. Farm fresh chicken, straight to your door.
        </p>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#0F3D24]/70">
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F5F0] py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">{children}</div>
    </main>
  );
}
