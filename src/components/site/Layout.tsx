import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#0F3D24]">
      <Header />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export function LeafIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20 4C11 4 4 11 4 20c6 0 13-2 16-8 2-4 0-8 0-8z" fill="currentColor" opacity="0.9" />
      <path d="M4 20c4-4 9-8 14-10" stroke="#0F3D24" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function LeafDividerSection() {
  return (
    <div className="my-16 flex items-center justify-center gap-4" aria-hidden>
      <span className="h-px w-16 bg-[#3F8F3F]/40" />
      <LeafIcon className="h-6 w-6 text-[#3F8F3F]" />
      <span className="h-px w-16 bg-[#3F8F3F]/40" />
    </div>
  );
}