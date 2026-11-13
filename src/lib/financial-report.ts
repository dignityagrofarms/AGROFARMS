/** Receipt basis: unpaid claims never become revenue. */
export function receivedAmount(row: { amount: number; amountPaid?: number | null }) {
  return Number(row.amountPaid ?? row.amount) || 0;
}
export function orderReceipts(row: { status: string; paymentStatus: string; total: number }) {
  return row.status !== "cancelled" && row.paymentStatus === "approved"
    ? Number(row.total) || 0
    : 0;
}
export function preorderReceipts(row: { amountPaid: number }) {
  return Number(row.amountPaid) || 0;
}
