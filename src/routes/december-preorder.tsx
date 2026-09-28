import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/Layout";
import { ArrowRight, Download } from "lucide-react";

export const Route = createFileRoute("/december-preorder")({
  head: () => ({
    meta: [
      { title: "December Pre-Order Sales · Dignity Agro Farms" },
      { name: "description", content: "Preorder your Christmas chicken now with Dignity Agro Farms." },
      { property: "og:title", content: "December Pre-Order Sales · Dignity Agro Farms" },
      { property: "og:image", content: "https://dignityagrofarms.com/assets/december-flyer.png" },
      { property: "og:url", content: "https://dignityagrofarms.com/december-preorder" },
    ],
    links: [{ rel: "canonical", href: "/december-preorder" }],
  }),
  component: FlyerLandingPage,
});

function FlyerLandingPage() {
  const navigate = useNavigate();

  return (
    <SiteLayout>
      <div className="bg-[#0F3D24] min-h-[calc(100vh-80px)] py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          
          <div className="relative mx-auto overflow-hidden rounded-3xl shadow-2xl ring-4 ring-[#3F8F3F]/30 bg-[#3F8F3F]/10 aspect-[4/5] max-w-lg mb-8">
            <img 
              src="/assets/december-flyer.png" 
              alt="December Pre-order Flyer" 
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={(e) => {
                // Fallback text if they haven't uploaded it yet
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = `
                  <div class="flex h-full flex-col items-center justify-center p-8 text-white">
                    <p class="mb-4 text-xl font-bold">Image not found</p>
                    <p class="text-sm opacity-70">Please upload your flyer to <br/><code>public/assets/december-flyer.png</code></p>
                  </div>
                `;
              }}
            />
          </div>

          <h1 className="mb-4 text-3xl font-bold text-white sm:text-4xl font-display">You Can Preorder Your Christmas Chicken Now</h1>
          <p className="mb-8 text-lg text-white/80">Pay small small, secure your slots, and enjoy free delivery within Owerri Municipal.</p>
          
          <button 
            onClick={() => navigate({ to: "/order", search: { mode: "december" } })} 
            className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-8 py-5 text-lg font-bold uppercase tracking-widest text-white shadow-lg transition hover:bg-red-500 hover:shadow-red-500/25 hover:-translate-y-1"
          >
            Order Now <ArrowRight size={24} />
          </button>
          
          <p className="mt-6 text-sm text-white/50">By clicking Order Now, you will be redirected to the main order page.</p>
        </div>
      </div>
    </SiteLayout>
  );
}
