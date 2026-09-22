import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Dignity Agro Farms Limited" },
      { name: "description", content: "How Dignity Agro Farms Limited collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy · Dignity Agro Farms Limited" },
      { property: "og:description", content: "How Dignity Agro Farms Limited collects, uses and protects your personal information." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Legal</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-white/80">Last updated: 10 August 2026</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="prose prose-green max-w-none text-[#0F3D24]/80">
          <p>
            Dignity Agro Farms Limited ("we", "us", "our") respects your privacy. This Privacy Policy explains how we collect, use, store and protect your personal information when you visit our website or place an order.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">1. Information we collect</h2>
          <p>When you place an order or contact us, we may collect:</p>
          <ul>
            <li>Your name and phone number</li>
            <li>Delivery address and preferred delivery zone</li>
            <li>Order details, product choices and payment status</li>
            <li>Any notes you provide with your order</li>
            <li>Your email address if you subscribe to farm updates</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">2. How we use your information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Process and deliver your orders</li>
            <li>Confirm payments and provide tracking updates</li>
            <li>Contact you about your order by phone or WhatsApp</li>
            <li>Send occasional farm updates if you subscribe</li>
            <li>Improve our products and service</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">3. How we share your information</h2>
          <p>
            We do not sell your personal information. We only share it with our delivery partners when necessary to fulfil your order, or when required by law.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">4. Data security</h2>
          <p>
            We store order data on secure cloud infrastructure with access limited to authorised staff. Payment is made by bank transfer to our designated account; we do not store your card or banking details on this website.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">5. Your rights</h2>
          <p>
            You can ask us to update, correct or delete your personal information at any time by contacting us on 070 8347 6366 or through our <Link to="/contact" className="text-[#3F8F3F] underline">Contact page</Link>.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">6. Cookies</h2>
          <p>
            Our website uses minimal cookies needed for basic functionality. We do not use tracking cookies for advertising.
          </p>

          <h2 className="text-2xl font-semibold text-[#0F3D24]">7. Contact us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at hello@dignityagrofarms.com or call 070 8347 6366.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
