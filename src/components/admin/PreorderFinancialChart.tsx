import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CheckCircle2, Clock, AlertCircle, ArrowUpRight, ShieldCheck, Bird, Ticket, Wallet } from "lucide-react";

interface PreorderFinancialChartProps {
  totalExpectedValue: number;
  totalReceived: number;
  totalPendingApproval: number;
  totalOwed: number;
  totalCount: number;
  totalBirds: number;
  slotReservedCount: number;
  slotReservedBirds: number;
  outrightCount: number;
  outrightBirds: number;
  freeCount: number;
  freeBirds: number;
  role: string;
}

export function PreorderFinancialChart({
  totalExpectedValue,
  totalReceived,
  totalPendingApproval,
  totalOwed,
  totalCount,
  totalBirds,
  slotReservedCount,
  slotReservedBirds,
  outrightCount,
  outrightBirds,
  freeCount,
  freeBirds,
  role,
}: PreorderFinancialChartProps) {
  const collectionRate = totalExpectedValue > 0 ? Math.round((totalReceived / totalExpectedValue) * 100) : 0;
  const pendingRate = totalExpectedValue > 0 ? Math.round((totalPendingApproval / totalExpectedValue) * 100) : 0;
  const owedRate = Math.max(0, 100 - collectionRate - pendingRate);

  // Financial Slices Data
  const data = [
    { name: "Confirmed Received", value: totalReceived > 0 ? totalReceived : 0, color: "#10B981", percent: collectionRate },
    { name: "Pending Verification", value: totalPendingApproval > 0 ? totalPendingApproval : 0, color: "#F59E0B", percent: pendingRate },
    { name: "Balance Outstanding", value: totalOwed > 0 ? totalOwed : 0, color: "#F43F5E", percent: owedRate },
  ].filter((item) => item.value > 0);

  // Fallback if everything is 0
  const chartData = data.length > 0 ? data : [{ name: "No Orders", value: 1, color: "#E2E8F0", percent: 100 }];

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white via-[#FCFBF7] to-[#F7F5F0] p-5 sm:p-7 ring-1 ring-[#0F3D24]/10 shadow-sm space-y-6">
      {/* Title & Collection Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0F3D24]/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#3F8F3F]">
            <ShieldCheck size={16} />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0F3D24]/70">
              December Financial Alignment & Reservation Breakdown
            </span>
          </div>
          <h3 className="text-lg font-black text-[#0F3D24] mt-0.5">
            Pre-Orders Capital & Cashflow Overview
          </h3>
          <p className="text-xs text-[#0F3D24]/60">
            Real-time balance reconciliation between confirmed deposits, unverified transfers, and pending balance.
          </p>
        </div>

        {role === "owner" && (
          <div className="rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-[#0F3D24]/10 flex items-center gap-3 shrink-0">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#0F3D24]/60 block tracking-wider">Gross Booking Value</span>
              <span className="text-lg font-black text-[#0F3D24]">₦{totalExpectedValue.toLocaleString()}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 block tracking-wider">Secured</span>
              <span className="text-lg font-black text-emerald-600">{collectionRate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Donut Chart on Left, Breakdown Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 relative">
          <div className="w-full h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(val: any) => [`₦${Number(val).toLocaleString()}`, "Amount"]}
                  contentStyle={{
                    backgroundColor: "#0F3D24",
                    color: "#fff",
                    borderRadius: "1rem",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={data.length > 1 ? 4 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Central Donut Hole Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F3D24]/60">
                {role === "owner" ? "Received" : "Orders"}
              </span>
              <span className="text-2xl font-black text-[#0F3D24] leading-tight">
                {role === "owner" ? `${collectionRate}%` : totalCount}
              </span>
              <span className="text-[10px] font-bold text-emerald-700">
                {role === "owner" ? `₦${totalReceived.toLocaleString()}` : `${totalBirds} Birds`}
              </span>
            </div>
          </div>

          {/* Slices Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-xs font-semibold">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full ring-1 ring-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Received: {collectionRate}%</span>
            </div>
            {totalPendingApproval > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1 rounded-full ring-1 ring-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Pending Approval: {pendingRate}%</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-800 px-3 py-1 rounded-full ring-1 ring-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Owed: {owedRate}%</span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Metric Cards & Reservation Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {/* Detailed Financial Alignment Strip (Owner View) */}
          {role === "owner" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Confirmed Received */}
              <div className="rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider">
                    Confirmed Received
                  </span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <p className="mt-1.5 text-xl font-black text-emerald-950">
                  ₦{totalReceived.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-emerald-800">
                  <span>{collectionRate}% of total booking</span>
                  <span className="bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-900">Verified</span>
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider">
                    Awaiting Approval
                  </span>
                  <Clock size={16} className="text-amber-600" />
                </div>
                <p className="mt-1.5 text-xl font-black text-amber-950">
                  ₦{totalPendingApproval.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-amber-800">
                  <span>{pendingRate}% of total booking</span>
                  <span className="bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900">Action req.</span>
                </div>
              </div>

              {/* Balance Owed */}
              <div className="rounded-2xl bg-rose-50/70 p-4 ring-1 ring-rose-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-rose-800 tracking-wider">
                    Remaining Owed
                  </span>
                  <AlertCircle size={16} className="text-rose-600" />
                </div>
                <p className="mt-1.5 text-xl font-black text-rose-950">
                  ₦{totalOwed.toLocaleString()}
                </p>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-rose-800">
                  <span>{owedRate}% to collect</span>
                  <span className="bg-rose-200/60 px-1.5 py-0.5 rounded text-rose-900">Pending delivery</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0F3D24]/5 p-4 ring-1 ring-[#0F3D24]/10">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F3D24]/60 block">Manager Role Notice</span>
              <p className="text-xs font-semibold text-[#0F3D24]/80 mt-0.5">
                Financial revenue metrics are managed by the Farm Owner. You can view all reservation types, delivery schedules, and fulfillment assignments below.
              </p>
            </div>
          )}

          {/* Reservation Modes Breakdown Strip */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#0F3D24]/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#0F3D24] uppercase tracking-wider flex items-center gap-1.5">
                <Bird size={14} className="text-[#3F8F3F]" /> Reservation Types & Poultry Allocation
              </span>
              <span className="text-[10px] font-bold text-[#0F3D24]/60">
                {totalCount} Total Pre-orders · {totalBirds} Total Birds
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Slot Reserved */}
              <div className="flex items-center gap-3 rounded-xl bg-[#F7F5F0] p-3 border border-[#0F3D24]/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Ticket size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#0F3D24]/70 block">Slot Reserved (₦3,500)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-black text-[#0F3D24]">{slotReservedCount}</span>
                    <span className="text-[10px] font-bold text-[#3F8F3F]">({slotReservedBirds} birds)</span>
                  </div>
                </div>
              </div>

              {/* Paid Outright */}
              <div className="flex items-center gap-3 rounded-xl bg-[#F7F5F0] p-3 border border-[#0F3D24]/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                  <Wallet size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#0F3D24]/70 block">Paid Outrightly (100%)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-black text-[#0F3D24]">{outrightCount}</span>
                    <span className="text-[10px] font-bold text-[#3F8F3F]">({outrightBirds} birds)</span>
                  </div>
                </div>
              </div>

              {/* Free Reservation */}
              <div className="flex items-center gap-3 rounded-xl bg-[#F7F5F0] p-3 border border-[#0F3D24]/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                  <Bird size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-[#0F3D24]/70 block">Free (Pay on Delivery)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-base font-black text-[#0F3D24]">{freeCount}</span>
                    <span className="text-[10px] font-bold text-[#3F8F3F]">({freeBirds} birds)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
