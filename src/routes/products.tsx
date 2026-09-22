import { createFileRoute, Link } from "@tanstack/react-router";
import { Drumstick, Scale, Home, PhoneCall, Egg, Feather, GraduationCap, CalendarClock } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Live Broilers Sold by Kg · Dignity Agro Farms" },
      { name: "description", content: "Healthy live broiler chickens sold by the kilogram at farm price, with fast home delivery across the city." },
      { property: "og:title", content: "Live Broilers by the Kg · Dignity Agro Farms" },
      { property: "og:description", content: "Farm-fresh live birds sold by weight. Home delivery at farm price." },
      { property: "og:url", content: "/products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  component: ProductsPage,
});

const whatWeDo = [
  { icon: Drumstick, title: "Broiler Farming", body: "Healthy meat birds raised from day-old chicks to market weight under strict biosecurity." },
  { icon: Feather, title: "Layer Farming", body: "Well-managed layer flocks producing consistent, high-quality table eggs year-round." },
  { icon: Egg, title: "Fresh Egg Supply", body: "Farm-fresh eggs supplied wholesale and retail to homes, shops, bakeries and events." },
  { icon: Scale, title: "Live & Dressed Chicken", body: "Sold by the kilogram at farm price, live or freshly dressed on request." },
  { icon: GraduationCap, title: "Poultry Consultancy", body: "Setup guidance, feeding programs and biosecurity training for new and growing farmers." },
  { icon: CalendarClock, title: "Pre-Orders", body: "Reserve birds or eggs ahead of time for a chosen date, perfect for events and festive seasons." },
];

const items = [
  {
    icon: Drumstick,
    title: "Live Broiler Chickens",
    desc: "Healthy, well-raised live birds ready for consumption: clean, active and farm fresh. Pick your bird; we weigh it in front of you.",
    price: "\u20a63,500 / Kg",
    ideal: "Households • Events • Restaurants",
  },
  {
    icon: Scale,
    title: "Dressed Chicken (Ready-to-Cook)",
    desc: "Prefer it dressed? We clean, dress and pack your bird fresh, never frozen, before it leaves the farm.",
    price: "\u20a64,000 / Kg",
    ideal: "Bulk buyers • Weekly meat plans • Families",
  },
  {
    icon: Home,
    title: "Fresh Table Eggs",
    desc: "Farm-fresh eggs collected daily from our layer flock, supplied in trays and crates for homes, shops and bakeries.",
    price: "Tray (30) \u20a64,500 \u2022 Half crate \u20a62,300 \u2022 Dozen \u20a61,800",
    ideal: "Busy homes • Offices • Repeat customers",
  },
  {
    icon: CalendarClock,
    title: "Pre-Order (Buy Ahead)",
    desc: "Reserve your birds or eggs for a future date \u2014 weddings, Christmas, Easter, weekly meat plans. Pay now, we raise and hold them for your chosen delivery day.",
    price: "Same per-Kg prices \u2022 Reserve from 2 days to 8 weeks ahead",
    ideal: "Events \u2022 Festive seasons \u2022 Weekly meat plans",
  },
  {
    icon: Drumstick,
    title: "Poultry Consultancy & Training",
    desc: "Pen setup guidance, feeding programs, biosecurity and hands-on training for new and growing farmers.",
    price: "From \u20a625,000 / session",
    ideal: "New farmers • Cooperatives • Investors",
  },
  {
    icon: Scale,
    title: "Bulk & Event Orders",
    desc: "Weddings, parties, church programs, restaurants \u2014 order in volume with reliable timing and consistent quality.",
    price: "10 birds+: 5% off \u2022 Custom quotes on request",
    ideal: "Caterers \u2022 Event planners \u2022 Eateries",
  },
];

function ProductsPage() {
  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Products, Services & Prices</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">What we do, with clear prices.</h1>
          <p className="mt-5 text-lg text-white/80">
            Live broilers by the Kg, dressed chicken, fresh eggs, home delivery, bulk orders and poultry consultancy, all priced honestly, straight from the farm.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="tel:+2347083476366" className="inline-flex items-center gap-2 rounded-full bg-[#3F8F3F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4ea94e]">
              <PhoneCall size={16} /> Call 070 8347 6366
            </a>
            <Link to="/order" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Place an Order
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-14">
          <div className="text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">What We Do</span>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Everything Poultry, Done Right.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#0F3D24]/70">
              From broiler and layer farming to fresh egg supply, chicken sold by the kilogram, pre-orders and hands-on poultry consultancy. We cover the full poultry value chain.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whatWeDo.map(({ icon: Icon, title, body }) => (
              <div key={title} className="group flex flex-col rounded-2xl border border-[#3F8F3F]/15 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0F3D24] text-[#a8e6a8] transition group-hover:bg-[#3F8F3F] group-hover:text-white">
                  <Icon size={26} />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0F3D24]/70">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map(({ icon: Icon, title, desc, ideal, price }) => (
            <article key={title} className="group rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5 transition hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0F3D24] text-[#a8e6a8] transition group-hover:bg-[#3F8F3F] group-hover:text-white">
                  <Icon size={26} />
                </div>
                <h2 className="text-2xl font-semibold">{title}</h2>
              </div>
              <p className="mt-5 leading-relaxed text-[#0F3D24]/75">{desc}</p>
              <p className="mt-4 inline-block rounded-full bg-[#3F8F3F]/10 px-4 py-1.5 text-sm font-semibold text-[#0F3D24]">{price}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#3F8F3F]">Ideal for: <span className="font-medium normal-case tracking-normal text-[#0F3D24]/70">{ideal}</span></p>
              <div className="mt-6 flex gap-3">
                <Link to="/order" className="inline-flex items-center rounded-full bg-[#3F8F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4ea94e]">Order Now</Link>
                <Link to="/contact" className="inline-flex items-center rounded-full border border-[#0F3D24]/15 px-5 py-2.5 text-sm font-semibold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white">Enquire</Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 grid gap-6 rounded-3xl bg-[#0F3D24] p-8 text-white sm:grid-cols-3">
          <div>
            <div className="text-3xl font-display font-semibold text-[#a8e6a8]">₦/Kg</div>
            <p className="mt-2 text-sm text-white/80">Priced by exact weight, weighed in front of you, no guessing, no overpaying.</p>
          </div>
          <div>
            <div className="text-3xl font-display font-semibold text-[#a8e6a8]">Quick</div>
            <p className="mt-2 text-sm text-white/80">Home delivery within our service zones. Order in the morning, cook by evening.</p>
          </div>
          <div>
            <div className="text-3xl font-display font-semibold text-[#a8e6a8]">Farm price</div>
            <p className="mt-2 text-sm text-white/80">Skip the market mark-up. Buy straight from the farm and save on every kilo.</p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}