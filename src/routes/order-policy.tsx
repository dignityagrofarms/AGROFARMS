import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowLeft, FileText, CheckCircle2, Clock, Truck, RefreshCw, AlertCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";

export const Route = createFileRoute("/order-policy")({
  head: () => ({
    meta: [
      { title: "Order Policy & Terms of Service · Dignity Agro Farms" },
      { name: "description", content: "Official Order Policy, Pre-Order Terms, Refund Policy, and Delivery Guidelines for Dignity Agro Farms." },
    ],
  }),
  component: OrderPolicyPage,
});

function OrderPolicyPage() {
  return (
    <SiteLayout>
      <div className="bg-[#F7F5F0] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="rounded-3xl bg-[#0F3D24] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <ShieldCheck size={260} />
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#3F8F3F] hover:text-white transition mb-6 bg-white/10 px-3 py-1.5 rounded-full"
            >
              <ArrowLeft size={14} /> Return to Home
            </Link>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#3F8F3F]" size={36} />
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Order Policy & Terms of Service</h1>
                <p className="mt-1 text-sm text-[#F7F5F0]/80">
                  Dignity Agro Farms · Official Guidelines for Standard Orders & December Pre-Orders
                </p>
              </div>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="rounded-3xl bg-amber-50 p-6 border border-amber-200/80 shadow-sm flex items-start gap-4">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-900 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-amber-950">
              <h3 className="font-bold text-base text-amber-900">Important Pre-Order Notice</h3>
              <p>
                By placing an order or reserving a December Christmas Pre-Order slot on Dignity Agro Farms, you agree to the policies outlined below. Please read these terms carefully prior to payment confirmation.
              </p>
            </div>
          </div>

          {/* Policy Content Sections */}
          <div className="space-y-6">
            {/* Section 1: Standard Orders & Fulfillment */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
              <div className="flex items-center gap-3 border-b border-[#0F3D24]/10 pb-4">
                <div className="rounded-2xl bg-[#0F3D24]/5 p-2.5 text-[#0F3D24]">
                  <Clock size={22} />
                </div>
                <h2 className="text-lg font-bold text-[#0F3D24]">1. Order Processing & Preparation</h2>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-[#0F3D24]/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span>Standard fresh poultry and farm orders typically require <strong>3 to 5 hours</strong> for confirmation, dressing, hygienic packaging, and rider dispatch.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span>Orders are confirmed upon receipt of valid payment proof or verified bank transfer alert.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span>You will receive an automated tracking code and optional WhatsApp / SMS updates as your order moves from preparation to delivery.</span>
                </li>
              </ul>
            </div>

            {/* Section 2: December Christmas Pre-Orders Policy */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
              <div className="flex items-center gap-3 border-b border-[#0F3D24]/10 pb-4">
                <div className="rounded-2xl bg-amber-100 p-2.5 text-amber-900">
                  <FileText size={22} />
                </div>
                <h2 className="text-lg font-bold text-[#0F3D24]">2. December Christmas Pre-Orders Policy</h2>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-[#0F3D24]/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span><strong>Fulfillment Window:</strong> All December Christmas pre-orders will be fulfilled strictly between <strong>December 1st and December 25th, 2026</strong> based on your selected preferred delivery date.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span><strong>Slot Reservation Deposit:</strong> Pre-order deposits secure your batch allocation and farm input costs. Deposit payments lock in your discount pricing against holiday price surges.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span><strong>Payment Completion:</strong> Any outstanding balance must be completed prior to final farm dispatch or pickup.</span>
                </li>
              </ul>
            </div>

            {/* Section 3: Delivery & Pickup Guidelines */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
              <div className="flex items-center gap-3 border-b border-[#0F3D24]/10 pb-4">
                <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-800">
                  <Truck size={22} />
                </div>
                <h2 className="text-lg font-bold text-[#0F3D24]">3. Delivery & Inspection Policy</h2>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-[#0F3D24]/80 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span><strong>Delivery Zones:</strong> We deliver across Owerri town and surrounding regions. Correct phone numbers and delivery addresses are required to avoid delay.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-[#3F8F3F] shrink-0 mt-0.5" />
                  <span><strong>Product Inspection:</strong> Customers are advised to inspect fresh poultry items upon arrival. Please notify our farm support team within 2 hours of delivery for any concerns.</span>
                </li>
              </ul>
            </div>

            {/* Section 4: Cancellation & Refund Terms */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-[#0F3D24]/10 space-y-4">
              <div className="flex items-center gap-3 border-b border-[#0F3D24]/10 pb-4">
                <div className="rounded-2xl bg-red-50 p-2.5 text-red-800">
                  <RefreshCw size={22} />
                </div>
                <h2 className="text-lg font-bold text-[#0F3D24]">4. Cancellations & Refunds</h2>
              </div>
              <p className="text-xs sm:text-sm text-[#0F3D24]/80 leading-relaxed">
                Pre-order slot reservations involve dedicated feed and livestock allocation. Cancellations requested before batch processing begins may qualify for partial credit. Orders cancelled after livestock preparation has commenced are non-refundable.
              </p>
            </div>
          </div>

          {/* Footer Contact Banner */}
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-[#0F3D24]/10">
            <p className="text-xs text-[#0F3D24]/70">
              Questions regarding our Order Policy? Contact Dignity Agro Farms customer care at{" "}
              <a href="tel:09071934173" className="font-bold text-[#3F8F3F] underline">09071934173</a> or via WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
