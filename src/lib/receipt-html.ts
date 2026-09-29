import type { AdminOrder } from "@/lib/orders.functions";
import type { Preorder, PreorderPayment } from "@/lib/preorders.functions";
import logoSrc from "@/assets/logo-forwhitebg.png";

const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const formatDate = (d: string | number | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const formatDateTime = (d: string | number | Date) => new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Standalone, printable receipt/invoice HTML for one order (used for bulk ZIP export). */
export function receiptHtml(o: AdminOrder): string {
  const paid = o.paymentStatus === "approved";
  const title = paid ? "RECEIPT" : "INVOICE";
  const dateLine = paid && o.paymentApprovedAt
    ? `Paid ${formatDateTime(o.paymentApprovedAt)}`
    : `Issued ${formatDateTime(o.createdAt)}`;
  const rows = o.items
    .map(
      (it) =>
        `<tr><td>${esc(it.product)} &middot; ${esc(it.option)}</td><td class="c">${it.qty}</td><td class="r">${naira(it.unitPrice)}</td><td class="r">${naira(it.unitPrice * it.qty)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title} ${esc(o.orderCode)} &middot; Dignity Agro Farms</title>
<style>
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;color:#0F3D24;background:#fff;margin:0;padding:32px}
.sheet{max-width:720px;margin:0 auto;border:1px solid #0F3D2422;border-radius:16px;padding:40px;box-sizing:border-box}
.head{display:flex;justify-content:space-between;border-bottom:2px solid #0F3D2411;padding-bottom:24px}
h1{font-size:24px;margin:0;letter-spacing:2px;font-weight:800}
.muted{color:#0F3D2499;font-size:12px}
.code{font-family:monospace;color:#3F8F3F;font-weight:700;font-size:16px;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0F3D2499;border-bottom:2px solid #0F3D2422;padding:12px 4px}
td{padding:12px 4px;border-bottom:1px solid #0F3D2411}
.c{text-align:center}
.r{text-align:right}
.totals{margin-top:24px;margin-left:auto;width:320px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411}
.totals div{display:flex;justify-content:space-between;padding:4px 0}
.total{border-top:1px solid #0F3D2422;font-weight:800;font-size:18px;padding-top:12px;margin-top:8px}
.stamp{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1px;background:${paid ? "#E6F4EA;color:#137333;border:1px solid #CEEAD6" : "#FEF7E0;color:#B06000;border:1px solid #FEEFC3"}}
footer{margin-top:32px;border-top:1px solid #0F3D2411;padding-top:16px;text-align:center;font-size:12px;color:#0F3D2499}
</style></head><body><div class="sheet">
<div class="head">
  <div>
    <img src="${window.location.origin}${logoSrc}" alt="Dignity Agro Farms Logo" style="height: 54px; margin-bottom: 16px; display: block;" />
    <div style="font-weight:800;font-size:18px;letter-spacing:-0.5px">Dignity Agro Farms Limited</div>
    <div class="muted" style="margin-top:4px">9 Oduobi Crescent, Ikenegbu, Owerri</div>
    <div class="muted">08167099492</div>
  </div>
  <div style="text-align:right;padding-top:8px">
    <h1 style="color:#0F3D24">${title}</h1>
    <div class="code">${esc(o.orderCode)}</div>
    <div class="muted" style="margin-top:4px">${esc(dateLine)}</div>
    <div class="stamp">${paid ? "PAYMENT CONFIRMED" : "AWAITING PAYMENT"}</div>
  </div>
</div>
<div style="margin-top:32px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#3F8F3F;margin-bottom:8px">Billed to</div>
  <div style="font-weight:800;font-size:16px">${esc(o.customerName)}</div>
  <div style="margin-top:4px;color:#0F3D24CC">${esc(o.phone)}</div>
  <div style="color:#0F3D24CC">${esc(o.address)}</div>
  <div class="muted" style="margin-top:2px">${o.deliveryZone === "owerri" ? "Owerri town" : "Outside Owerri"}</div>
</div>
<div style="margin-top:32px">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#0F3D24">Order Details</div>
  <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Total Amount</th></tr></thead>
  <tbody>${rows}</tbody></table>
</div>
<div class="totals">
  <div><span style="color:#0F3D2499;font-weight:600">Subtotal</span><span style="font-weight:800">${naira(o.subtotal)}</span></div>
  <div style="margin-top:4px"><span style="color:#0F3D2499;font-weight:600">Delivery</span><span style="font-weight:800">${o.deliveryFee === 0 ? "FREE" : naira(o.deliveryFee)}</span></div>
  <div class="total" style="color:#0F3D24"><span>Total Amount</span><span>${naira(o.total)}</span></div>
</div>
<div class="muted" style="margin-top:24px;text-align:center">Payment method: Bank transfer &middot; Moniepoint MFB &middot; 4006179439 &middot; Dignity Agro Farms Limited</div>
${o.status === "cancelled" ? `<div class="muted" style="margin-top:8px;color:#b91c1c;text-align:center;font-weight:600">Order cancelled by ${o.cancelledBy === "customer" ? "customer" : "the farm"}${o.cancelReason ? `: ${esc(o.cancelReason)}` : ""}${o.cancelledAt ? ` on ${formatDateTime(o.cancelledAt)}` : ""}</div>` : ""}
<footer>Thank you for choosing Dignity Agro Farms.<br/>Farm fresh chicken, straight to your door.</footer>
</div></body></html>`;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/** Standalone receipt for a SINGLE payment on a pre-order. */
export function preorderPaymentReceiptHtml(o: Preorder, p: PreorderPayment, paymentIndex: number): string {
  const dateLine = `Paid ${new Date(p.paymentDate).toLocaleString()}`;
  
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>PAYMENT RECEIPT ${esc(o.preorderCode)} &middot; Dignity Agro Farms</title>
<style>
#pdf-receipt-target { margin:0;background:#fff; }
#pdf-receipt-target .sheet{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;color:#0F3D24;background:#fff;max-width:720px;margin:0 auto;border:1px solid #0F3D2422;border-radius:16px;padding:40px;box-sizing:border-box}
#pdf-receipt-target .head{display:flex;justify-content:space-between;border-bottom:2px solid #0F3D2411;padding-bottom:24px}
#pdf-receipt-target h1{font-size:24px;margin:0;letter-spacing:2px;font-weight:800}
#pdf-receipt-target .muted{color:#0F3D2499;font-size:12px}
#pdf-receipt-target .code{font-family:monospace;color:#3F8F3F;font-weight:700;font-size:16px;margin-top:4px}
#pdf-receipt-target table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
#pdf-receipt-target th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0F3D2499;border-bottom:2px solid #0F3D2422;padding:12px 4px}
#pdf-receipt-target td{padding:12px 4px;border-bottom:1px solid #0F3D2411}
#pdf-receipt-target .c{text-align:center}
#pdf-receipt-target .r{text-align:right}
#pdf-receipt-target .totals{margin-top:24px;margin-left:auto;width:320px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411}
#pdf-receipt-target .totals div{display:flex;justify-content:space-between;padding:4px 0}
#pdf-receipt-target .total{border-top:1px solid #0F3D2422;font-weight:800;font-size:18px;padding-top:12px;margin-top:8px}
#pdf-receipt-target .stamp{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1px;background:#E6F4EA;color:#137333;border:1px solid #CEEAD6}
#pdf-receipt-target footer{margin-top:32px;border-top:1px solid #0F3D2411;padding-top:16px;text-align:center;font-size:12px;color:#0F3D2499}
</style></head><body><div id="pdf-receipt-target"><div class="sheet">
<div class="head">
  <div>
    <img src="${window.location.origin}${logoSrc}" alt="Dignity Agro Farms Logo" style="height: 54px; margin-bottom: 16px; display: block;" />
    <div style="font-weight:800;font-size:18px;letter-spacing:-0.5px">Dignity Agro Farms Limited</div>
    <div class="muted" style="margin-top:4px">9 Oduobi Crescent, Ikenegbu, Owerri</div>
    <div class="muted">08167099492</div>
  </div>
  <div style="text-align:right;padding-top:8px">
    <h1 style="color:#0F3D24">PAYMENT RECEIPT</h1>
    <div class="code">${esc(o.preorderCode)}</div>
    <div class="muted" style="margin-top:4px">${esc(dateLine)}</div>
    <div class="stamp">${ordinal(paymentIndex).toUpperCase()} PAYMENT</div>
  </div>
</div>
<div style="margin-top:32px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#3F8F3F;margin-bottom:8px">Billed to</div>
  <div style="font-weight:800;font-size:16px">${esc(o.customerName)}</div>
  <div style="margin-top:4px;color:#0F3D24CC">${esc(o.phone)}</div>
  <div style="color:#0F3D24CC">${esc(o.address)}</div>
</div>
<div style="margin-top:32px">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#0F3D24">Order Details</div>
  <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Total Value</th></tr></thead>
  <tbody>
  <tr><td style="font-weight:600">${esc(o.product)} (Pre-order)</td><td class="c">${o.quantity}</td><td class="r">${naira(o.unitPrice)}</td><td class="r" style="font-weight:600">${naira(o.totalAmount)}</td></tr>
  </tbody></table>
</div>
<div class="totals">
  <div><span style="color:#0F3D2499;font-weight:600">Order Total Value</span><span style="font-weight:800">${naira(o.totalAmount)}</span></div>
  <div class="total" style="color:#137333"><span>Amount Paid</span><span>${naira(p.amount)}</span></div>
  <div style="margin-top:4px"><span style="color:#0F3D2499;font-weight:600">Reference:</span><span style="font-family:monospace;font-weight:700">${esc(p.paymentReference)}</span></div>
</div>
<div class="muted" style="margin-top:24px;text-align:center">This receipt serves as proof of a single installment payment toward the total order value.</div>
<footer>Thank you for choosing Dignity Agro Farms.<br/>Farm fresh chicken, straight to your door.</footer>
</div></div></body></html>`;
}

/** Standalone COMPLETE receipt for a pre-order showing all installments. */
export function preorderCompleteReceiptHtml(o: Preorder, payments: PreorderPayment[]): string {
  const fullyPaid = o.paymentStatus === "fully_paid";
  const title = fullyPaid ? "COMPLETE RECEIPT" : "ORDER SUMMARY";
  const dateLine = `Generated ${formatDateTime(new Date())}`;
  
  const paymentRows = payments.map((p, i) => 
    `<tr>
      <td>${formatDate(p.paymentDate)}</td>
      <td><span style="font-weight:600">${ordinal(i + 1)} Payment</span> <span class="muted">(${esc(p.paymentReference)})</span></td>
      <td class="r" style="color:#3F8F3F;font-weight:bold">${naira(p.amount)}</td>
    </tr>`
  ).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title} ${esc(o.preorderCode)} &middot; Dignity Agro Farms</title>
<style>
#pdf-receipt-target { margin:0;background:#fff; }
#pdf-receipt-target .sheet{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;color:#0F3D24;background:#fff;max-width:720px;margin:0 auto;border:1px solid #0F3D2422;border-radius:16px;padding:40px;box-sizing:border-box}
#pdf-receipt-target .head{display:flex;justify-content:space-between;border-bottom:2px solid #0F3D2411;padding-bottom:24px}
#pdf-receipt-target h1{font-size:24px;margin:0;letter-spacing:2px;font-weight:800}
#pdf-receipt-target .muted{color:#0F3D2499;font-size:12px}
#pdf-receipt-target .code{font-family:monospace;color:#3F8F3F;font-weight:700;font-size:16px;margin-top:4px}
#pdf-receipt-target table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}
#pdf-receipt-target th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0F3D2499;border-bottom:2px solid #0F3D2422;padding:12px 4px}
#pdf-receipt-target td{padding:12px 4px;border-bottom:1px solid #0F3D2411}
#pdf-receipt-target .c{text-align:center}
#pdf-receipt-target .r{text-align:right}
#pdf-receipt-target .totals{margin-top:24px;margin-left:auto;width:320px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411}
#pdf-receipt-target .totals div{display:flex;justify-content:space-between;padding:4px 0}
#pdf-receipt-target .total{border-top:1px solid #0F3D2422;font-weight:800;font-size:18px;padding-top:12px;margin-top:8px}
#pdf-receipt-target .stamp{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1px;background:${fullyPaid ? "#E6F4EA;color:#137333;border:1px solid #CEEAD6" : "#FEF7E0;color:#B06000;border:1px solid #FEEFC3"}}
#pdf-receipt-target footer{margin-top:32px;border-top:1px solid #0F3D2411;padding-top:16px;text-align:center;font-size:12px;color:#0F3D2499}
</style></head><body><div id="pdf-receipt-target"><div class="sheet">
<div class="head">
  <div>
    <img src="${window.location.origin}${logoSrc}" alt="Dignity Agro Farms Logo" style="height: 54px; margin-bottom: 16px; display: block;" />
    <div style="font-weight:800;font-size:18px;letter-spacing:-0.5px">Dignity Agro Farms Limited</div>
    <div class="muted" style="margin-top:4px">9 Oduobi Crescent, Ikenegbu, Owerri</div>
    <div class="muted">08167099492</div>
  </div>
  <div style="text-align:right;padding-top:8px">
    <h1 style="color:#0F3D24">${title}</h1>
    <div class="code">${esc(o.preorderCode)}</div>
    <div class="muted" style="margin-top:4px">${esc(dateLine)}</div>
    <div class="stamp">${fullyPaid ? "FULLY PAID" : "PARTIALLY PAID"}</div>
  </div>
</div>
<div style="margin-top:32px;font-size:14px;background:#F9FAF9;padding:16px;border-radius:12px;border:1px solid #0F3D2411">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#3F8F3F;margin-bottom:8px">Billed to</div>
  <div style="font-weight:800;font-size:16px">${esc(o.customerName)}</div>
  <div style="margin-top:4px;color:#0F3D24CC">${esc(o.phone)}</div>
  <div style="color:#0F3D24CC">${esc(o.address)}</div>
</div>

<div style="margin-top:32px">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#0F3D24">Order Details</div>
  <table><thead><tr><th>Item</th><th class="c">Qty</th><th class="r">Unit Price</th><th class="r">Total Amount</th></tr></thead>
  <tbody>
  <tr><td style="font-weight:600">${esc(o.product)} (Pre-order)</td><td class="c">${o.quantity}</td><td class="r">${naira(o.unitPrice)}</td><td class="r" style="font-weight:600">${naira(o.totalAmount)}</td></tr>
  </tbody></table>
</div>

<div style="margin-top:40px;">
  <div class="muted" style="text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#0F3D24">Payment Installment History</div>
  ${payments.length > 0 ? `
  <table><thead><tr><th>Date</th><th>Installment</th><th class="r">Amount Paid</th></tr></thead>
  <tbody>${paymentRows}</tbody></table>
  ` : `<div style="margin-top:16px;padding:16px;background:#FEF7E0;border-radius:8px;border:1px solid #FEEFC3;color:#B06000;font-weight:600;font-size:13px">No confirmed payments yet. Please add a payment to see history.</div>`}
</div>

<div class="totals">
  <div><span style="color:#0F3D2499;font-weight:600">Order Total Value</span><span style="font-weight:800">${naira(o.totalAmount)}</span></div>
  <div style="margin-top:4px"><span style="color:#3F8F3F;font-weight:600">Total Amount Paid</span><span style="color:#3F8F3F;font-weight:800">${naira(o.amountPaid)}</span></div>
  <div class="total" style="${o.balance > 0 ? "color:#B06000" : "color:#137333"}"><span>Balance Outstanding</span><span>${naira(o.balance)}</span></div>
</div>
<div class="muted" style="margin-top:24px;text-align:center">This summary does not serve as proof of full payment unless all installments are confirmed and fully paid.</div>
<footer>Thank you for choosing Dignity Agro Farms.<br/>Farm fresh chicken, straight to your door.</footer>
</div></div></body></html>`;
}
