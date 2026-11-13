/* eslint-disable @typescript-eslint/no-explicit-any -- Operational tables are newer than the generated Supabase schema. */
import { receivedAmount, orderReceipts } from "./financial-report";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkPasscode } from "./orders.functions";
import { assertFinancialRead } from "./farm.functions";
import type { FarmFinancial } from "./farm.functions";
export type ReceiptRow = FarmFinancial & {
  orderId?: string;
  preorderId?: string;
  isOrder?: boolean;
  isDecemberPreorder?: boolean;
  source: string;
  originalAmount?: number;
};
async function allRows(db: any, table: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db
      .from(table)
      .select(table === "admin_access" ? "username,full_name,role" : "*")
      .order(table === "admin_access" ? "username" : "id")
      .range(offset, offset + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export const adminReceiptReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ passcode: z.string(), batchId: z.string().uuid().optional() }).parse(input),
  )
  .handler(({ data }) => loadReceiptReport(data));
export async function loadReceiptReport(data: {
  passcode: string;
  batchId?: string;
}): Promise<{ rows: ReceiptRow[]; outstandingSales: number }> {
  await checkPasscode(data.passcode);
  await assertFinancialRead(data.passcode, data.batchId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [financials, orders, preorders, payments, batches, users] = await Promise.all(
    [
      "farm_financials",
      "orders",
      "preorders",
      "preorder_payments",
      "farm_batches",
      "admin_access",
    ].map((table) => allRows(supabaseAdmin, table)),
  );
  const batchName = (id: string) => batches.find((b) => b.id === id)?.batch_name ?? null;
  const rows: ReceiptRow[] = [];
  let outstandingSales = 0;
  for (const f of financials) {
    if (data.batchId && f.batch_id !== data.batchId) continue;
    if (f.approval_status && f.approval_status !== "approved") continue;
    const user = users.find((u) => u.username === f.recorded_by);
    const paid = receivedAmount({ amount: Number(f.amount), amountPaid: f.amount_paid });
    if (f.type === "income") outstandingSales += Math.max(0, Number(f.amount) - paid);
    rows.push({
      id: f.id,
      batchId: f.batch_id,
      batchName: batchName(f.batch_id),
      type: f.type,
      category: f.category,
      originalAmount: Number(f.amount),
      amount: f.type === "income" ? paid : Number(f.amount),
      amountPaid: f.amount_paid,
      description: f.description,
      paymentMethod: f.payment_method,
      transactionDate: f.transaction_date,
      referenceNo: f.reference_no,
      recordedBy: f.recorded_by,
      recordedByName:
        f.recorded_by_name || user?.full_name || f.recorded_by || "Unknown legacy submitter",
      recordedByRole: f.recorded_by_role || user?.role || null,
      createdAt: f.created_at,
      source: f.source_contact_id ? "Contact sale / supply" : "Farm ledger",
      feedBags: f.feed_bags,
      feedKgPerBag: f.feed_kg_per_bag,
      feedBrand: f.feed_brand,
      birdsSold: f.birds_sold,
    });
  }
  for (const o of orders) {
    if (data.batchId && o.batch_id !== data.batchId) continue;
    if (o.status === "cancelled") continue;
    if (!orderReceipts({ status: o.status, paymentStatus: o.payment_status, total: o.total })) {
      outstandingSales += Number(o.total);
      continue;
    }
    rows.push({
      id: `order_${o.id}`,
      orderId: o.id,
      batchId: o.batch_id,
      batchName: batchName(o.batch_id),
      type: "income",
      category: "Store Order",
      amount: Number(o.total),
      description: `Order #${o.order_code} (${o.customer_name})`,
      paymentMethod: "Bank Transfer",
      transactionDate: (o.payment_approved_at || o.created_at).slice(0, 10),
      referenceNo: o.order_code,
      recordedBy: null,
      recordedByName: "Online customer",
      createdAt: o.created_at,
      isOrder: true,
      source: "Storefront",
    });
  }
  for (const p of preorders) {
    if (data.batchId && p.batch_id !== data.batchId) continue;
    const confirmed = payments.filter(
      (payment) => payment.preorder_id === p.id && payment.confirmed_by_admin,
    );
    const paid = confirmed.reduce((sum, payment) => sum + Number(payment.amount), 0);
    // Explicitly preserve legacy confirmed balances without counting them twice.
    const legacyPaid = Math.max(0, Number(p.amount_paid || 0) - paid);
    outstandingSales += Math.max(0, Number(p.total_amount) - paid - legacyPaid);
    const receipts = [
      ...confirmed,
      ...(legacyPaid > 0
        ? [
            {
              id: "legacy",
              amount: legacyPaid,
              payment_date: p.created_at,
              payment_reference: p.preorder_code,
            },
          ]
        : []),
    ];
    for (const receipt of receipts)
      rows.push({
        id: `preorder_${p.id}_${receipt.id}`,
        preorderId: p.id,
        batchId: p.batch_id,
        batchName: batchName(p.batch_id),
        type: "income",
        category: "December Pre-Order",
        amount: Number(receipt.amount),
        description: `Preorder #${p.preorder_code} (${p.customer_name})${receipt.id === "legacy" ? " — legacy confirmed balance" : ""}`,
        paymentMethod: "Bank Transfer",
        transactionDate: receipt.payment_date.slice(0, 10),
        referenceNo: receipt.payment_reference,
        recordedBy: null,
        recordedByName: "Preorder customer",
        createdAt: receipt.payment_date,
        isOrder: true,
        isDecemberPreorder: true,
        source: "Preorder installment",
      });
  }
  return {
    rows: rows
      .filter(
        (r) =>
          (!data.batchId || r.batchId === data.batchId) && (r.type === "expense" || r.amount > 0),
      )
      .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate)),
    outstandingSales,
  };
}
