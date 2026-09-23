import { createFileRoute, Link } from "@tanstack/react-router";
import { Drumstick, Scale, Home, PhoneCall, Egg, Feather, GraduationCap, CalendarClock } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { PRODUCTS } from "@/lib/products";

// Auto-generate JSON-LD schema from the shared products catalog.
// When you change a price or name in src/lib/products.ts, this schema updates automatically.
function buildProductSchema() {
  const itemListElement = PRODUCTS.map((p, idx) => ({
    "@type": "ListItem",
    "position": idx + 1,
    "item": {
      "@type": "Product",
      "@id": `https://dignityagrofarms.com/products#${p.id}`,
      "name": p.name,
      "description": p.description,
      "image": p.image,
      "brand": {
        "@type": "Brand",
        "name": "Dignity Agro Farms"
      },
      "offers": p.options.map((opt) => ({
        "@type": "Offer",
        "name": opt.label,
        "price": opt.price,
        "priceCurrency": "NGN",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Dignity Agro Farms Limited"
        },
        "url": "https://dignityagrofarms.com/order",
        "areaServed": {
          "@type": "City",
          "name": "Owerri"
        }
      }))
    }
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Dignity Agro Farms Products & Prices",
    "description": "Live broiler chickens, dressed chicken, fresh eggs and poultry consultancy in Owerri, Nigeria.",
    "url": "https://dignityagrofarms.com/products",
    "numberOfItems": PRODUCTS.length,
    "itemListElement": itemListElement,
  };
}

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Products & Prices · Live Broilers, Dressed Chicken & Eggs | Dignity Agro Farms" },
      { name: "description", content: "Buy live broiler chickens by Kg, freshly dressed chicken, farm-fresh eggs and poultry consultancy services in Owerri. Farm price, fast delivery." },
      { property: "og:title", content: "Products & Prices | Dignity Agro Farms" },
      { property: "og:description", content: "Live broilers, dressed chicken, fresh eggs and consultancy. All at farm price with fast delivery in Owerri." },
      { property: "og:url", content: "https://dignityagrofarms.com/products" },
      { property: "og:image", content: "https://dignityagrofarms.com/assets/live-broiler.jpg" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Farm-Fresh Chicken & Eggs | Dignity Agro Farms" },
      { name: "twitter:description", content: "Live broilers, dressed chicken and farm-fresh eggs in Owerri at honest farm prices." },
      { name: "twitter:image", content: "https://dignityagrofarms.com/assets/live-broiler.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://dignityagrofarms.com/products" }],
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

const naira = (n: number) => "\u20a6" + n.toLocaleString("en-NG");

const ICONS: Record<string, React.ElementType> = {
  live: Drumstick,
  dressed: Scale,
  eggs: Home,
  consult: GraduationCap,
};

function ProductsPage() {
  const productSchema = buildProductSchema();

  return (
    <SiteLayout>
      {/* Auto-generated JSON-LD Product Schema from shared products catalog */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

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

        {/* Product cards auto-generated from PRODUCTS catalog */}
        <div className="grid gap-6 md:grid-cols-2">
          {PRODUCTS.map((product) => {
            const Icon = ICONS[product.id] ?? Drumstick;
            const lowestPrice = Math.min(...product.options.map((o) => o.price));
            return (
              <article
                key={product.id}
                id={product.id}
                className="group rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0F3D24] text-[#a8e6a8] transition group-hover:bg-[#3F8F3F] group-hover:text-white">
                    <Icon size={26} />
                  </div>
                  <h2 className="text-2xl font-semibold">{product.name}</h2>
                </div>
                <p className="mt-5 leading-relaxed text-[#0F3D24]/75">{product.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.options.map((opt) => (
                    <span key={opt.label} className="rounded-full bg-[#3F8F3F]/10 px-3 py-1 text-xs font-semibold text-[#0F3D24]">
                      {opt.label} — {naira(opt.price)}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold text-[#3F8F3F]">
                  From {naira(lowestPrice)} / {product.unitLabel}
                </p>
                <div className="mt-6 flex gap-3">
                  <Link to="/order" className="inline-flex items-center rounded-full bg-[#3F8F3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4ea94e]">Order Now</Link>
                  <Link to="/contact" className="inline-flex items-center rounded-full border border-[#0F3D24]/15 px-5 py-2.5 text-sm font-semibold text-[#0F3D24] hover:bg-[#0F3D24] hover:text-white">Enquire</Link>
                </div>
              </article>
            );
          })}
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
