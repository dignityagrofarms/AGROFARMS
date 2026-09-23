import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import farmBanner from "@/assets/farm-banner.jpg.asset.json";
import eggsImg from "@/assets/eggs.jpg.asset.json";
import broilerImg from "@/assets/live-broiler.jpg.asset.json";
import dressedImg from "@/assets/dressed-chicken.jpg.asset.json";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Farm Updates · Dignity Agro Farms Limited" },
      { name: "description", content: "Farm tips, behind-the-scenes, and announcements from Dignity Agro Farms Limited." },
      { property: "og:title", content: "Farm Updates · Dignity Agro Farms" },
      { property: "og:description", content: "Tips, updates, and stories from the farm." },
      { property: "og:url", content: "/blog" },
      { property: "og:image", content: farmBanner.url },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

const posts = [
  {
    cat: "Behind the Scenes",
    title: "A morning at Dignity: from feeding to egg collection",
    excerpt: "Every day starts early at the farm. We check feed, water, ventilation and flock health before the first eggs are collected and packed for delivery.",
    img: farmBanner.url,
    date: "5 August 2026",
  },
  {
    cat: "Farm Tips",
    title: "Why live weight matters when buying chicken",
    excerpt: "Buying by the kilogram means you pay for exactly what you get. Learn why open weighing protects you from overpaying for ice, feathers or guesswork.",
    img: broilerImg.url,
    date: "1 August 2026",
  },
  {
    cat: "Announcement",
    title: "Fresh egg supply now open for weekly household delivery",
    excerpt: "Get a tray or half crate of farm-fresh eggs delivered weekly. No market queues, no broken eggs, just consistent quality from our layer flock.",
    img: eggsImg.url,
    date: "28 July 2026",
  },
  {
    cat: "Farm Tips",
    title: "Dressed vs live: which should you order?",
    excerpt: "Live birds are great for events and personal processing. Dressed chicken saves time and is ready for the pot. Here is how to choose.",
    img: dressedImg.url,
    date: "22 July 2026",
  },
  {
    cat: "Farm Tips",
    title: "Biosecurity basics every small poultry farm should follow",
    excerpt: "Simple habits like foot dips, visitor control and clean water do more for flock health than expensive drugs. Here are the basics we practise daily.",
    img: farmBanner.url,
    date: "15 July 2026",
  },
  {
    cat: "Announcement",
    title: "Pre-order your birds for events and festive seasons",
    excerpt: "Reserve broilers ahead of Christmas, Easter, weddings or family events. Pay now and we will raise and hold your birds for your chosen delivery date.",
    img: broilerImg.url,
    date: "8 July 2026",
  },
];

function BlogPage() {
  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">Farm Updates</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Tips, stories, announcements</h1>
          <p className="mt-5 text-lg text-white/80">Practical farm wisdom and glimpses of daily life at Dignity Agro Farms.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <article key={p.title} className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/5 transition hover:-translate-y-1 hover:shadow-md">
              <div className="relative h-48 overflow-hidden">
                <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0F3D24]">{p.cat}</span>
              </div>
              <div className="p-6">
                <p className="text-xs text-[#0F3D24]/50">{p.date}</p>
                <h3 className="mt-2 font-display text-xl font-semibold leading-snug text-[#0F3D24]">{p.title}</h3>
                <p className="mt-3 text-sm text-[#0F3D24]/70">{p.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
