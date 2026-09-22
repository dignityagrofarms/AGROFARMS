import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logo from "@/assets/dignity-logo.jpeg.asset.json";

const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/products", label: "Products & Services" },
  { to: "/order", label: "Order" },
  { to: "/blog", label: "Farm Updates" },
  { to: "/track-order", label: "Track Order" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[#0B2E1B] shadow-lg"
          : "bg-[#0F3D24]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo.url} alt="Dignity Agro Farms" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#3F8F3F]/60" />
          <div className="hidden sm:block leading-tight">
            <div className="font-display text-lg font-semibold text-white">Dignity</div>
            <div className="text-[10px] uppercase tracking-widest text-[#a8e6a8]">Agro Farms Ltd</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
              activeProps={{ className: "!bg-[#3F8F3F] !text-white shadow" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/order"
            className="hidden sm:inline-flex items-center rounded-full bg-[#3F8F3F] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#4ea94e] hover:shadow-lg"
          >
            Order Now
          </Link>
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-[#0F3D24] px-4 py-3">
          <nav className="flex flex-col gap-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
                activeProps={{ className: "!bg-[#3F8F3F] !text-white" }}
              >
                {n.label}
              </Link>
            ))}
            <Link
              to="/order"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[#3F8F3F] px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Order Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}