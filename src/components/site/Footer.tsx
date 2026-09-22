import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Phone, MapPin, Mail } from "lucide-react";
import logo from "@/assets/logo.png";

export function Footer() {
  return (
    <footer className="mt-24 bg-[#0F3D24] text-white/80">
      <LeafDivider />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="Dignity Agro Farms" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#3F8F3F]/60" />
            <div>
              <div className="font-display text-lg font-semibold text-white">Dignity Agro Farms</div>
              <div className="text-[11px] uppercase tracking-widest text-[#a8e6a8]">Limited</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            Farm-Fresh Chicken. Straight to Your Door.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/products" className="hover:text-white">Products & Services</Link></li>
            <li><Link to="/blog" className="hover:text-white">Farm Updates</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
          <h4 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-white">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-[#a8e6a8]" /><a href="tel:+2347083476366" className="hover:text-white">070 8347 6366</a></li>
            <li className="flex items-start gap-2"><Mail size={16} className="mt-0.5 shrink-0 text-[#a8e6a8]" /><a href="mailto:hello@dignityagrofarms.com" className="hover:text-white">hello@dignityagrofarms.com</a></li>
            <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-[#a8e6a8]" /><span>9 Oduobi Crescent, Ikenegbu</span></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Follow Our Journey</h4>
          <p className="text-sm mb-4">@dignityagrofarms</p>
          <div className="flex gap-3">
            <a href="https://instagram.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-[#3F8F3F]"><Instagram size={18} /></a>
            <a href="https://facebook.com/dignityagrofarms" target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-[#3F8F3F]"><Facebook size={18} /></a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-white/60 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Dignity Agro Farms Limited. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function LeafDivider() {
  return (
    <div className="h-6 w-full" aria-hidden>
      <svg viewBox="0 0 1440 24" preserveAspectRatio="none" className="h-full w-full">
        <path d="M0,24 C240,0 480,0 720,12 C960,24 1200,24 1440,0 L1440,24 Z" fill="#0F3D24" />
      </svg>
    </div>
  );
}