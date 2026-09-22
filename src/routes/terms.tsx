import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Dignity Agro Farms Limited" },
      { name: "description", content: "Terms and conditions for ordering from Dignity Agro Farms Limited." },
      { property: "og:title", content: "Terms of Service · Dignity Agro Farms Limited" },
      { property: "og:description", content: "Terms and conditions for ordering from Dignity Agro Farms Limited." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Legal</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-white/80">Last updated: 10 August 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="prose prose-green max-w-none text-[#0F3D24]/80">
          <p>
            These Terms of Service govern your use of the Dignity Agro Farms Limited website and your orders with us. By placing an order, you agree to these terms.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">1. Orders and pricing</h2>
          <p>
            All prices are listed in Nigerian Naira (₦). Prices for live and dressed chicken are per kilogram and are weighed at the farm or before delivery. Eggs are sold by the dozen, half crate or full tray. Delivery within Owerri town is free; deliveries outside Owerri town attract a ₦1,000 delivery fee.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">2. Minimum order</h2>
          <p>
            The minimum order value is ₦5,000. Orders below this amount cannot be processed.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">3. Payment</h2>
          <p>
            Payment is made by bank transfer to our designated account shown on the order confirmation page. Only send payment to the account displayed on our website. We are not responsible for payments sent to any other account. After transferring, tap "I have made payment" so we can confirm and start preparing your order.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">4. Order confirmation and approval</h2>
          <p>
            Your order is confirmed once we approve your payment. You will receive updates as your order moves from received to preparing, out for delivery and delivered. Tracking is available with your order number.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">5. Cancellation</h2>
          <p>
            You can cancel your order online while it is still in "Received" or "Being Prepared" status and before payment is approved. After payment is approved or once the order is out for delivery, cancellation must be done by calling 070 8347 6366.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">6. Delivery</h2>
          <p>
            We aim for quick delivery within our service zones after payment is confirmed. Delivery times may vary based on traffic, weather and order volume. We will communicate any delays via WhatsApp or phone.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">7. Quality and returns</h2>
          <p>
            We sell live, healthy birds and fresh farm products. Because these are perishable goods, returns are not accepted once the product has been delivered and accepted. If there is a genuine issue with your order, contact us within 24 hours of delivery.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">8. Pre-orders</h2>
          <p>
            Pre-orders reserve birds or eggs for a future date. Pre-orders are confirmed once payment is approved. We will hold your products for the chosen delivery date.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">9. Changes to terms</h2>
          <p>
            We may update these terms from time to time. The latest version will always be available on this page.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">10. Contact</h2>
          <p>
            For questions about these terms, please contact us through our <Link to="/contact" className="text-[#3F8F3F] underline">Contact page</Link> or call 070 8347 6366.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
