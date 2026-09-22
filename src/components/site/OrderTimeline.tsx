import { CheckCircle2, Clock, CreditCard, Ban, Truck, Home, PackageSearch } from "lucide-react";

export type TimelineOrder = {
  createdAt: string;
  paymentStatus: "pending" | "submitted" | "approved" | "rejected";
  paymentSubmittedAt?: string | null;
  paymentApprovedAt?: string | null;
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  updatedAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "");

/** Compact event history for an order, including how and when it was cancelled. */
export function OrderTimeline({ order }: { order: TimelineOrder }) {
  const events: { icon: typeof Clock; label: string; when: string; tone?: "danger" | "ok" }[] = [
    { icon: CheckCircle2, label: "Order placed", when: fmt(order.createdAt) },
  ];

  if (order.paymentSubmittedAt) {
    events.push({ icon: CreditCard, label: "Customer confirmed payment", when: fmt(order.paymentSubmittedAt) });
  }
  if (order.paymentApprovedAt) {
    events.push({ icon: CheckCircle2, label: "Payment approved", when: fmt(order.paymentApprovedAt), tone: "ok" });
  }
  if (order.paymentStatus === "rejected") {
    events.push({ icon: Ban, label: "Payment rejected", when: fmt(order.updatedAt), tone: "danger" });
  }
  if (order.status === "preparing" || order.status === "out_for_delivery" || order.status === "delivered") {
    events.push({ icon: PackageSearch, label: "Being prepared", when: "" });
  }
  if (order.status === "out_for_delivery" || order.status === "delivered") {
    events.push({ icon: Truck, label: "Out for delivery", when: "" });
  }
  if (order.status === "delivered") {
    events.push({ icon: Home, label: "Delivered", when: fmt(order.updatedAt), tone: "ok" });
  }
  if (order.status === "cancelled") {
    events.push({
      icon: Ban,
      label: `Cancelled by ${order.cancelledBy === "customer" ? "customer" : "the farm"}${order.cancelReason ? `: ${order.cancelReason}` : ""}`,
      when: fmt(order.cancelledAt ?? order.updatedAt),
      tone: "danger",
    });
  }

  return (
    <div className="mt-4 rounded-2xl bg-[#F7F5F0] p-4 ring-1 ring-[#0F3D24]/10">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[#0F3D24]/60">Timeline</div>
      <ol className="mt-3 space-y-3">
        {events.map((e, i) => {
          const Icon = e.icon;
          const color = e.tone === "danger" ? "text-red-600" : e.tone === "ok" ? "text-[#3F8F3F]" : "text-[#0F3D24]/60";
          return (
            <li key={i} className="flex items-start gap-3">
              <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#0F3D24]">{e.label}</div>
                {e.when && <div className="text-xs text-[#0F3D24]/55">{e.when}</div>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
