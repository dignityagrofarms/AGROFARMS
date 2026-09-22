import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, CheckCircle2, ShoppingCart, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us · Dignity Agro Farms Limited" },
      { name: "description", content: "Call, WhatsApp or visit Dignity Agro Farms Limited. Phone 070 8347 6366, 9 Oduobi Crescent, Ikenegbu, Owerri. Ready to buy? Use our Order page." },
      { property: "og:title", content: "Contact · Dignity Agro Farms" },
      { property: "og:description", content: "Reach the farm for enquiries, consultancy and support." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", topic: "General enquiry", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `New enquiry · Dignity Agro Farms\n\nName: ${form.name}\nPhone: ${form.phone}\nEmail: ${form.email}\nTopic: ${form.topic}\n\nMessage: ${form.message}`
    );
    window.open(`https://wa.me/2347083476366?text=${text}`, "_blank");
    setSent(true);
  };

  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Get in touch</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Contact Us</h1>
          <p className="mt-5 text-lg text-white/80">Questions, consultancy or support, talk to the farm directly.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#3F8F3F] p-6 text-white shadow-sm">
          <div>
            <p className="text-lg font-semibold">Want to buy chicken or eggs?</p>
            <p className="text-sm text-white/85">Place your order online: pick weight, quantity and delivery, see the price instantly and track it after.</p>
          </div>
          <Link to="/order" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0F3D24] hover:bg-[#F7F5F0]">
            <ShoppingCart size={16} /> Place your order
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.5fr_1fr] lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5">
          {sent ? (
            <div className="text-center py-10">
              <CheckCircle2 className="mx-auto text-[#3F8F3F]" size={56} />
              <h3 className="mt-4 text-2xl font-semibold">Thanks! Your enquiry is on its way.</h3>
              <p className="mt-2 text-[#0F3D24]/70">We've opened WhatsApp so your message reaches us instantly. We'll follow up shortly.</p>
              <button onClick={() => setSent(false)} className="mt-6 rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white">Send another</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-2xl font-semibold text-[#0F3D24]">Send us a message</h2>
                <p className="mt-1 text-sm text-[#0F3D24]/70">For general enquiries, consultancy bookings, partnerships or help with an existing order.</p>
              </div>
              <Field label="Full Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Phone" required type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0F3D24]/70">What is it about?</label>
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/30"
                >
                  <option>General enquiry</option>
                  <option>Farm consultancy</option>
                  <option>Bulk / event supply</option>
                  <option>Help with an existing order</option>
                  <option>Partnership or wholesale</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0F3D24]/70">Message</label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/30"
                />
              </div>
              <button type="submit" className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F3D24] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#134a2c]">
                <MessageCircle size={16} /> Send message
              </button>
              <p className="sm:col-span-2 text-center text-xs text-[#0F3D24]/60">
                Buying chicken or eggs? <Link to="/order" className="font-semibold text-[#3F8F3F] underline">Use the order page</Link> instead. It prices everything for you.
              </p>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <InfoCard icon={Phone} title="Call us"><a href="tel:+2347083476366" className="hover:text-[#3F8F3F]">070 8347 6366</a></InfoCard>
          <InfoCard icon={Mail} title="Email"><a href="mailto:hello@dignityagrofarms.com" className="hover:text-[#3F8F3F]">hello@dignityagrofarms.com</a></InfoCard>
          <InfoCard icon={MapPin} title="Farm Address">9 Oduobi Crescent, Ikenegbu</InfoCard>
          <InfoCard icon={Clock} title="Business Hours">Mon – Sat · 8:00am – 6:00pm</InfoCard>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0F3D24]/70">Follow us</p>
            <div className="mt-3 flex gap-3">
              <a href="https://instagram.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-[#0F3D24] text-white transition hover:bg-[#3F8F3F]"><Instagram size={18} /></a>
              <a href="https://facebook.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-11 w-11 place-items-center rounded-full bg-[#0F3D24] text-white transition hover:bg-[#3F8F3F]"><Facebook size={18} /></a>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl shadow-sm ring-1 ring-[#0F3D24]/5">
          <iframe
            title="Farm Location"
            src="https://www.google.com/maps?q=Ikenegbu%20Owerri&output=embed"
            className="h-80 w-full border-0"
            loading="lazy"
          />
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-[#0F3D24]/70">{label}{required && <span className="text-[#3F8F3F]">*</span>}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={200}
        className="rounded-xl border border-[#0F3D24]/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#3F8F3F] focus:ring-2 focus:ring-[#3F8F3F]/30"
      />
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-[#0F3D24] text-[#a8e6a8]"><Icon size={18} /></div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0F3D24]/60">{title}</p>
        <p className="mt-1 text-[#0F3D24]">{children}</p>
      </div>
    </div>
  );
}