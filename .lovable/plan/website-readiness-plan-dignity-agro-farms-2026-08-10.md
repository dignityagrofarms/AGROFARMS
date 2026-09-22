# Website Readiness Plan — Dignity Agro Farms

## Current state

The core business loop is solid and working: customer places an order → sees bank details → claims payment → admin approves → customer tracks with one code → receipt/invoice downloads. The admin panel handles status updates, payment decisions, cancellations, reports, CSV export, bulk receipt ZIP download and passcode management.

I estimate the site is **about 80% launch-ready** for a soft launch. The remaining 20% is mostly polish, trust signals, legal coverage and true automation.

## Phase 1 — Launch blockers (this week)

These are the items that should be fixed before the site is promoted to real customers.

1. **Blog placeholders**
   - The Farm Updates page still shows "Coming soon" cards.
   - Decision: either write 3–4 real posts (farm tips, behind-the-scenes, announcement) or temporarily hide the Blog nav link until content is ready.

2. **Legal pages**
   - Add a Privacy Policy page and a Terms of Service page.
   - Link them in the footer.
   - Required for any site that collects phone numbers, addresses and payment claims.

3. **Newsletter form**
   - The homepage newsletter form currently does nothing (`onSubmit` only prevents default).
   - Decision: either wire it to save emails in the database and notify you on WhatsApp, or remove it until you have an email list tool.

4. **Order confirmation to the customer**
   - Right now the customer only sees their order code on screen. If they close the browser, they lose it.
   - Add an immediate WhatsApp/SMS confirmation after checkout. Until the WhatsApp API is approved, this can be a pre-filled `wa.me` link that the customer taps, or a simple SMS link.

5. **Testimonials**
   - The three testimonials on the home page are fabricated.
   - Replace them with real quotes from customers, or remove the section and replace with a trust strip (farm photos, hygiene, delivery count).

6. **Final end-to-end test**
   - Place a test order, claim payment, approve it in admin, move through each status, download receipt, cancel a test order, and verify reports/CSV numbers.

## Phase 2 — Automated WhatsApp notifications

You selected automated WhatsApp. The realistic path is:

1. **Set up Twilio/WhatsApp Business**
   - Use the Lovable Twilio connector.
   - WhatsApp Business requires Meta business verification and pre-approved message templates; this usually takes 1–3 business days.

2. **Message templates**
   - Create approved templates for:
     - Order confirmation with order code and bank details
     - Payment approved
     - Out for delivery
     - Delivered + thank you

3. **Server-side sending**
   - Add a server function that sends the right template at the right moment.
   - Keep the existing manual "Notify on WhatsApp" buttons as fallback until templates are live.

## Phase 3 — Post-launch operational improvements

1. **Inventory / stock control**
   - Add an admin panel to mark live birds, dressed chicken and eggs as available or sold out.
   - Block orders when stock is zero.

2. **Multi-item cart**
   - Let customers add multiple products in one order instead of one product at a time.

3. **Customer accounts / order history**
   - Optional sign-in so repeat customers can see past orders without typing codes.

4. **Delivery time slots**
   - Let customers pick morning/afternoon/evening delivery windows.

5. **Analytics**
   - Add basic conversion tracking so you know how many visitors place orders.

## Recommended sequence

Because you want to launch this week, I suggest we do **Phase 1 first**, start the **Twilio connector setup in parallel**, and schedule **Phase 3** for after launch. The WhatsApp API verification cannot be rushed by Meta, so the site should launch with manual fallback and switch to full automation as soon as templates are approved.
