import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PhoneCall, Leaf, BadgeCheck, Wallet, Clock, CheckCircle2, Instagram, Facebook } from "lucide-react";
import { SiteLayout, LeafDividerSection } from "@/components/site/Layout";
import { MISSION_HEADLINE, MISSION_BODY } from "@/lib/brand";
import { subscribeToNewsletter } from "@/lib/newsletter.functions";
import broilerImg from "@/assets/live-broiler.jpg.asset.json";
import dressedImg from "@/assets/dressed-chicken.jpg.asset.json";
import eggsImg from "@/assets/eggs.jpg.asset.json";
import farmBanner from "@/assets/farm-banner.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dignity Agro Farms | Fresh Poultry & Eggs in Owerri" },
      { name: "description", content: "Buy live broilers, dressed chicken, and farm-fresh eggs straight from our poultry farm in Owerri. Fast delivery, wholesale & retail." },
      { property: "og:title", content: "Dignity Agro Farms | Fresh Poultry & Eggs in Owerri" },
      { property: "og:description", content: "Buy live broilers, dressed chicken, and farm-fresh eggs straight from our poultry farm in Owerri. Fast delivery, wholesale & retail." },
      { property: "og:url", content: "/" },
      { property: "og:image", content: farmBanner.url },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const featured = [
  {
    id: "live",
    title: "Live Broilers",
    desc: "Healthy, active birds, chosen and weighed with you before delivery.",
    tag: "Sold by the Kg",
    img: broilerImg.url,
    sizes: ["Small (1.5–2kg)", "Medium (2–2.5kg)", "Large (2.5–3kg+)"],
  },
  {
    id: "dressed",
    title: "Dressed on Request",
    desc: "Prefer it ready to cook? We clean and dress your bird before delivery.",
    tag: "Fresh, Not Frozen",
    img: dressedImg.url,
    sizes: ["Whole Dressed", "Cut in Parts", "Deboned"],
  },
  {
    id: "eggs",
    title: "Fresh Table Eggs",
    desc: "Collected daily from our layer flock and supplied in trays and crates.",
    tag: "Collected Daily",
    img: eggsImg.url,
    sizes: ["Dozen", "Half crate", "Tray (30)"],
  },
];

function Index() {
  const [selected, setSelected] = useState<Record<string, string>>({});
  return (
    <SiteLayout>
      {/* HERO: single static pen photo (fast load) */}
      <section className="relative isolate overflow-hidden">
        <div className="relative h-[560px] w-full sm:h-[640px] lg:h-[720px]">
          <img
            src={farmBanner.url}
            alt="The pen houses at Dignity Agro Farms in Owerri"
            width={1600}
            height={1100}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Readability overlay - Richer Gradient Mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F3D24]/95 via-[#0F3D24]/70 to-[#3F8F3F]/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F3D24] via-transparent to-[#0F3D24]/20" />

          <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#a8e6a8]/30 bg-[#3F8F3F]/20 px-4 py-1.5 text-xs uppercase tracking-widest text-[#a8e6a8] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
                <Leaf size={14} /> Inside Our Farm
              </span>
              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] drop-shadow-2xl sm:text-5xl lg:text-6xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
                Farm-Fresh Chicken. <br />
                <span className="text-[#a8e6a8]">Straight to Your Door.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/90 drop-shadow-md animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                Healthy live broilers sold by the kilogram at farm price, farm-fresh eggs, and quick home delivery, straight from Dignity Agro Farms to your kitchen.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
                <Link to="/order" className="inline-flex items-center rounded-full bg-[#3F8F3F] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(63,143,63,0.4)] transition-all hover:bg-[#4ea94e] hover:shadow-[0_0_25px_rgba(63,143,63,0.6)] hover:-translate-y-0.5">
                  Order Now
                </Link>
                <a href="tel:+2347083476366" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/15 hover:-translate-y-0.5">
                  <PhoneCall size={16} /> Call 070 8347 6366
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Our Mission</span>
        <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">{MISSION_HEADLINE}</h2>
        <p className="mt-5 text-lg leading-relaxed text-[#0F3D24]/80">{MISSION_BODY}</p>
      </section>

      {/* COMPETITIVE EDGE */}
      <section className="bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Why buy from us</span>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Why families keep <span className="text-[#3F8F3F]">coming back to our farm.</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#0F3D24]/70">No cold-store rehashes. No market queues. Just live, healthy birds, weighed honestly, priced fairly, and delivered fast.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Wallet, title: "Farm Price, Always", body: "Direct from us to you, saving you money on every kilo compared to market prices." },
              { icon: BadgeCheck, title: "Weighed in Your Presence", body: "Transparent Kg-based pricing. What the scale shows is what you pay." },
              { icon: Clock, title: "Quick Delivery", body: "We move fast once your payment is confirmed. Live or freshly dressed on request." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="group rounded-3xl bg-[#0F3D24] p-8 text-white ring-1 ring-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(15,61,36,0.3)]">
                <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 transition-colors group-hover:bg-[#3F8F3F]/40">
                  <Icon className="text-[#a8e6a8]" size={28} />
                </div>
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LeafDividerSection />

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Featured</span>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Farm-fresh products</h2>
            <p className="mt-3 max-w-xl text-[#0F3D24]/70">Pick a product, choose your option, and we'll take care of the rest.</p>
          </div>
          <Link to="/products" className="inline-flex items-center rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c]">View All →</Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => {
            const chosen = selected[p.id];
            return (
              <div key={p.id} className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:ring-[#0F3D24]/10">
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-[#0F3D24] shadow-md backdrop-blur-sm">{p.tag}</span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm text-[#0F3D24]/70">{p.desc}</p>

                  <div className="mt-5">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Choose an option</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.sizes.map((s) => {
                        const active = chosen === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setSelected((prev) => ({ ...prev, [p.id]: s }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              active
                                ? "bg-[#3F8F3F] text-white shadow"
                                : "border border-[#0F3D24]/15 bg-white text-[#0F3D24] hover:border-[#3F8F3F] hover:text-[#3F8F3F]"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Link
                    to="/order"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0F3D24] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#134a2c]"
                  >
                    {chosen ? `Order · ${chosen}` : "Enquire / Order"} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-[#0F3D24] text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Why families trust us</span>
              <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Farm price. Open weighing. Quick delivery.</h2>
              <p className="mt-4 max-w-lg text-white/80">
                Every order is handled on the farm by people who care about the birds and the customers. No market markups, no hidden weights, no long waits.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: BadgeCheck, title: "Weighed in your presence", body: "Transparent Kg pricing. What the scale shows is what you pay." },
                { icon: Wallet, title: "Direct farm savings", body: "Skip the middleman and buy straight from the farm at better prices." },
                { icon: Clock, title: "Quick home delivery", body: "Orders move fast once payment is confirmed, straight to your kitchen." },
                { icon: Leaf, title: "Raised with care", body: "Healthy birds and fresh eggs from a clean, well managed farm in Owerri." },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <Icon className="text-[#a8e6a8]" size={22} />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-white/75">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold sm:text-4xl">Follow Our Journey</h2>
        <p className="mt-3 text-[#0F3D24]/70">Behind-the-scenes updates, farm tips, and product announcements.</p>
        <NewsletterForm />
        <div className="mt-6 flex items-center justify-center gap-3">
          <a href="https://instagram.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#0F3D24] text-white transition hover:bg-[#3F8F3F]"><Instagram size={18} /></a>
          <a href="https://facebook.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#0F3D24] text-white transition hover:bg-[#3F8F3F]"><Facebook size={18} /></a>
        </div>
        <p className="mt-3 text-sm text-[#0F3D24]/60">@dignityagrofarms</p>
      </section>
    </SiteLayout>
  );
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const subscribeFn = useServerFn(subscribeToNewsletter);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMsg("");
    try {
      await subscribeFn({ data: { email } });
      setStatus("success");
      setEmail("");
      setMsg("You are subscribed. We will send farm updates to your inbox.");
    } catch (err) {
      setStatus("error");
      setMsg(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-2xl bg-[#3F8F3F]/10 p-4 text-[#0F3D24] ring-1 ring-[#3F8F3F]/30">
        <CheckCircle2 size={18} className="text-[#3F8F3F]" />
        <p className="text-sm font-medium">{msg}</p>
      </div>
    );
  }

  return (
    <form className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 rounded-full border border-[#0F3D24]/15 bg-white px-5 py-3 text-sm outline-none ring-[#3F8F3F] focus:ring-2"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-[#0F3D24] px-6 py-3 text-sm font-semibold text-white hover:bg-[#134a2c] disabled:opacity-60"
      >
        {status === "loading" ? "Subscribing…" : "Subscribe"}
      </button>
      {status === "error" && <p className="sm:col-span-2 text-xs text-red-600">{msg}</p>}
    </form>
  );
}
