import { createFileRoute } from "@tanstack/react-router";
import { Leaf, HeartHandshake, ShieldCheck, Sprout } from "lucide-react";
import { SiteLayout, LeafDividerSection } from "@/components/site/Layout";
import { MISSION_HEADLINE, MISSION_BODY } from "@/lib/brand";
import director from "@/assets/director.jpg.asset.json";
import farmLife1 from "@/assets/farm-life-1.jpg.asset.json";
import farmLife2 from "@/assets/farm-life-2.jpg.asset.json";
import farmLife3 from "@/assets/farm-life-3.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Dignity Agro Farms Limited" },
      { name: "description", content: "Our beginning, mission, vision and the values that guide Dignity Agro Farms Limited." },
      { property: "og:title", content: "About · Dignity Agro Farms Limited" },
      { property: "og:description", content: "Our story and the values behind our poultry farm." },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: ShieldCheck, title: "Integrity", body: "We do what we say, from feed quality to timely delivery." },
  { icon: HeartHandshake, title: "Care", body: "Every bird is raised with attention, respect, and dignity." },
  { icon: Leaf, title: "Consistency", body: "Predictable quality your business and household can count on." },
  { icon: Sprout, title: "Growth", body: "Learning, improving, and expanding responsibly." },
];

function AboutPage() {
  return (
    <SiteLayout>
      <section className="bg-[#0F3D24] py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#a8e6a8]">About Us</span>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Our Beginning</h1>
          <p className="mt-6 text-lg text-white/80">
            Dignity Agro Farms Limited was born from a simple vision: to raise poultry with care, integrity, and a deep commitment to quality. What began as a small family conviction has grown into a farm serving households, retailers, and wholesalers across our community.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          { title: "Mission", body: `${MISSION_HEADLINE} ${MISSION_BODY}` },
          { title: "Vision", body: "To be West Africa's most trusted, care-led poultry brand, known for quality birds, fresh eggs, and integrity in every transaction." },
          { title: "Promise", body: "Every crate of eggs and every bird delivered carries the Dignity name, and everything it stands for." },
        ].map((s) => (
          <div key={s.title} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5">
            <h3 className="font-display text-2xl font-semibold text-[#0F3D24]">{s.title}</h3>
            <p className="mt-3 text-[#0F3D24]/75">{s.body}</p>
          </div>
        ))}
      </section>

      <LeafDividerSection />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Core Values</span>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">What we hold to</h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-[#0F3D24]/5">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#0F3D24] text-[#a8e6a8]">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-[#0F3D24]/70">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Leadership</span>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">The team behind Dignity</h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-8 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#0F3D24]/5 sm:grid-cols-[220px_1fr] sm:items-center">
          <img
            src={director.url}
            alt="The Director of Dignity Agro Farms Limited in farm workwear"
            loading="lazy"
            className="mx-auto h-56 w-56 rounded-3xl object-cover object-top ring-4 ring-[#3F8F3F]/20"
          />
          <div className="text-center sm:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Director</span>
            <h3 className="mt-2 font-display text-2xl font-semibold text-[#0F3D24]">Director & Founder</h3>
            <p className="mt-3 text-[#0F3D24]/75">
              On the farm daily, personally overseeing flock health, feed quality, biosecurity and every delivery that leaves our gate. Dignity Agro Farms is run hands on, and that is exactly why our customers trust what they receive.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#3F8F3F]">Farm Gallery</span>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Life on the farm</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#0F3D24]/70">Real photos from Dignity Agro Farms: our pen houses, our grounds, and the people who run them.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { img: farmLife1.url, title: "Inside the pen house", body: "Clean, well-ventilated and freshly prepared housing, the foundation of healthy birds." },
            { img: farmLife2.url, title: "Hands-on management", body: "Our founder on the grounds daily, checking the flock, feed and biosecurity in person." },
            { img: farmLife3.url, title: "Room to grow", body: "Spacious, tree-shaded grounds in Owerri with multiple pen blocks for broilers and layers." },
          ].map((f) => (
            <figure key={f.title} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/5">
              <img src={f.img} alt={f.title} loading="lazy" className="h-72 w-full object-cover" />
              <figcaption className="p-6">
                <h3 className="font-display text-xl font-semibold text-[#0F3D24]">{f.title}</h3>
                <p className="mt-2 text-sm text-[#0F3D24]/70">{f.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}