# Customer Cancellation + One Canonical Order Form

## 1. Customers can cancel their own order

On **Track Your Order**, each order card gets a "Cancel this order" button, with a confirm dialog asking for a short reason (dropdown: changed my mind / ordered by mistake / wrong details / found it elsewhere / other + free text).

Rules (safe by design):
- Allowed while the order is **Received** or **Preparing** and payment is **not yet approved**.
- Once payment is approved or the order is **Out for delivery / Delivered**, the button is replaced with: "This order can no longer be cancelled online — call 070 8347 6366." (Admin can still cancel it manually.)
- Cancelling sets status to Cancelled, records who cancelled it (customer) and the reason, and stops the tracker.
- After confirming, WhatsApp opens with a pre-filled note to the farm so the admin is alerted immediately.

## 2. Admin visibility: cancelled and incomplete orders

Admin Orders tab gains clearer states:
- **Cancelled** rows show a red badge that says either "Cancelled by customer" or "Cancelled by farm", plus the reason and the time.
- New **"Not completed"** view: orders still awaiting payment (pending or rejected) with no activity for over 24 hours — i.e. people who started but never paid. Shown as an amber badge and available as a filter.
- Filter dropdown adds: All / Cancelled by customer / Cancelled by farm / Not completed.
- Reports summary adds two counters: Cancelled and Not completed, and revenue keeps counting approved payments only.
- CSV export includes the new columns (cancelled by, cancel reason, not-completed flag).

## 3. Contact page vs Order page — Order is canonical

- **/order** stays the only place to buy: pick product, weight, quantity, delivery zone, live price, saved to the database, order code, receipt, tracking.
- **/contact** loses its ordering form. It becomes a real contact page: phone, WhatsApp, email, address, hours, map, socials, plus a short **general enquiry / consultancy** message form (name, phone, message) that goes to WhatsApp — no products, no quantities, no prices.
- A prominent banner on /contact: "Want to buy chicken or eggs? Place your order here →" linking to /order.
- Header/footer "Order Now" buttons all point to /order; contact stays as "Contact".
- Existing /contact links keep working, so nothing breaks for anyone who bookmarked it.

## Technical notes

- Migration on `orders`: add `cancelled_at timestamptz`, `cancelled_by text` ('customer' | 'admin'), `cancel_reason text`. No destructive change; existing rows unaffected.
- New server function `cancelOrderByCustomer` in `src/lib/orders.functions.ts`, verified by order code + phone (same check the receipt uses), and rejecting the request server-side unless status/payment are in a cancellable state.
- `adminListOrders` filter extended with a `view` param for `cancelled_customer`, `cancelled_admin`, `not_completed` (payment pending/rejected AND `updated_at < now() - 24h` AND status not cancelled/delivered).
- `adminUpdateOrder` sets `cancelled_by = 'admin'` when an admin moves an order to Cancelled.
- Frontend edits: `src/routes/track-order.tsx` (cancel UI), `src/routes/admin.orders.tsx` (badges, filter, counters, CSV), `src/routes/contact.tsx` (form rewrite), header/footer CTA check.
