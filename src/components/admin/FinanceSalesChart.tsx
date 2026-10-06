import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Clock,
} from "lucide-react";
import { adminListOrders, type AdminOrder } from "@/lib/orders.functions";
import type { FarmFinancial } from "@/lib/farm.functions";

type TimeFrame = "24h" | "7d" | "1m" | "6m" | "1y";

interface FinanceSalesChartProps {
  passcode: string;
  financials: FarmFinancial[];
}

const formatNaira = (val: number) =>
  "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function FinanceSalesChart({ passcode, financials }: FinanceSalesChartProps) {
  const [timeframe, setTimeframe] = useState<TimeFrame>("7d");
  const [selectedYear, setSelectedYear] = useState<number | "current">("current");
  const listOrdersFn = useServerFn(adminListOrders);

  // Fetch all orders for complete revenue tracking
  const ordersQuery = useQuery({
    queryKey: ["admin-orders-chart", passcode],
    queryFn: () => listOrdersFn({ data: { passcode } }),
    enabled: Boolean(passcode),
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const orders: AdminOrder[] = ordersQuery.data?.orders || [];

  // Filter out cancelled orders for sales reporting
  const validOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "cancelled");
  }, [orders]);

  // Income items from farm financials (excluding Store Orders to prevent double-counting with store sales)
  const incomeFinancials = useMemo(() => {
    return financials.filter((f) => f.type === "income" && f.category !== "Store Order");
  }, [financials]);

  // Extract all available years dynamically from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    validOrders.forEach((o) => {
      const y = new Date(o.createdAt).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });

    incomeFinancials.forEach((f) => {
      const y = new Date(f.transactionDate || f.createdAt).getFullYear();
      if (!isNaN(y)) yearsSet.add(y);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [validOrders, incomeFinancials]);

  // Aggregate sales data based on timeframe or selected custom year
  const chartData = useMemo(() => {
    const now = new Date();

    // If user selected a custom past year (e.g. 2025, 2024, 2023)
    if (typeof selectedYear === "number") {
      const data: { label: string; monthKey: string; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (let m = 0; m < 12; m++) {
        const label = `${monthNames[m]} '${String(selectedYear).slice(2)}`;
        const monthOrders = validOrders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        });
        const storeSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const monthIncome = incomeFinancials.filter((f) => {
          const d = new Date(f.transactionDate || f.createdAt);
          return d.getFullYear() === selectedYear && d.getMonth() === m;
        });
        const farmIncome = monthIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

        data.push({
          label,
          monthKey: `${selectedYear}-${String(m + 1).padStart(2, "0")}`,
          storeSales,
          farmIncome,
          totalSales: storeSales + farmIncome,
          orderCount: monthOrders.length,
        });
      }
      return data;
    }

    if (timeframe === "24h") {
      // 24 Hourly buckets
      const data: { label: string; timestamp: number; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(currentHour.getTime() - i * 60 * 60 * 1000);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000 - 1);
        const label = hourStart.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });

        const hourOrders = validOrders.filter((o) => {
          const t = new Date(o.createdAt).getTime();
          return t >= hourStart.getTime() && t <= hourEnd.getTime();
        });
        const storeSales = hourOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const hourIncome = incomeFinancials.filter((f) => {
          const t = new Date(f.transactionDate || f.createdAt).getTime();
          return t >= hourStart.getTime() && t <= hourEnd.getTime();
        });
        const farmIncome = hourIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

        data.push({
          label,
          timestamp: hourStart.getTime(),
          storeSales,
          farmIncome,
          totalSales: storeSales + farmIncome,
          orderCount: hourOrders.length,
        });
      }
      return data;
    }

    if (timeframe === "7d") {
      // 7 Daily buckets
      const data: { label: string; dateStr: string; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

        const dayOrders = validOrders.filter((o) => o.createdAt.startsWith(dateStr));
        const storeSales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const dayIncome = incomeFinancials.filter((f) => {
          const finDate = (f.transactionDate || f.createdAt).split("T")[0];
          return finDate === dateStr;
        });
        const farmIncome = dayIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

        data.push({
          label,
          dateStr,
          storeSales,
          farmIncome,
          totalSales: storeSales + farmIncome,
          orderCount: dayOrders.length,
        });
      }
      return data;
    }

    if (timeframe === "1m") {
      // Last 30 days
      const data: { label: string; dateStr: string; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

        const dayOrders = validOrders.filter((o) => o.createdAt.startsWith(dateStr));
        const storeSales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const dayIncome = incomeFinancials.filter((f) => {
          const finDate = (f.transactionDate || f.createdAt).split("T")[0];
          return finDate === dateStr;
        });
        const farmIncome = dayIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

        data.push({
          label,
          dateStr,
          storeSales,
          farmIncome,
          totalSales: storeSales + farmIncome,
          orderCount: dayOrders.length,
        });
      }
      return data;
    }

    if (timeframe === "6m") {
      // Last 6 Calendar Months
      const data: { label: string; monthKey: string; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

        const monthOrders = validOrders.filter((o) => {
          const oDate = new Date(o.createdAt);
          return oDate.getFullYear() === year && oDate.getMonth() === month;
        });
        const storeSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const monthIncome = incomeFinancials.filter((f) => {
          const fDate = new Date(f.transactionDate || f.createdAt);
          return fDate.getFullYear() === year && fDate.getMonth() === month;
        });
        const farmIncome = monthIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

        data.push({
          label,
          monthKey,
          storeSales,
          farmIncome,
          totalSales: storeSales + farmIncome,
          orderCount: monthOrders.length,
        });
      }
      return data;
    }

    // timeframe === "1y" (12 Months)
    const data: { label: string; monthKey: string; totalSales: number; storeSales: number; farmIncome: number; orderCount: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

      const monthOrders = validOrders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return oDate.getFullYear() === year && oDate.getMonth() === month;
      });
      const storeSales = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

      const monthIncome = incomeFinancials.filter((f) => {
        const fDate = new Date(f.transactionDate || f.createdAt);
        return fDate.getFullYear() === year && fDate.getMonth() === month;
      });
      const farmIncome = monthIncome.reduce((sum, f) => sum + (f.amount || 0), 0);

      data.push({
        label,
        monthKey,
        storeSales,
        farmIncome,
        totalSales: storeSales + farmIncome,
        orderCount: monthOrders.length,
      });
    }
    return data;
  }, [timeframe, selectedYear, validOrders, incomeFinancials]);

  // Aggregate metrics
  const totalPeriodSales = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.totalSales, 0);
  }, [chartData]);

  const totalStoreSales = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.storeSales, 0);
  }, [chartData]);

  const totalOrdersCount = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.orderCount, 0);
  }, [chartData]);

  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.totalSales - a.totalSales)[0];
  }, [chartData]);

  const averageSales = useMemo(() => {
    if (chartData.length === 0) return 0;
    return totalPeriodSales / chartData.length;
  }, [totalPeriodSales, chartData]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-white/95 p-4 shadow-xl backdrop-blur-md text-xs text-[#0F3D24]">
          <div className="flex items-center gap-1.5 font-bold text-[#0F3D24] border-b border-[#0F3D24]/10 pb-2 mb-2">
            <Clock size={13} className="text-[#3F8F3F]" />
            <span>{label}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4">
              <span className="font-semibold text-[#0F3D24]/70">Total Revenue:</span>
              <span className="font-bold text-[#0F3D24]">{formatNaira(data.totalSales)}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-[#3F8F3F]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3F8F3F] inline-block" />
                Store Orders:
              </span>
              <span className="font-semibold">{formatNaira(data.storeSales)} ({data.orderCount} orders)</span>
            </div>
            {data.farmIncome > 0 && (
              <div className="flex justify-between items-center gap-4 text-[#D97706]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D97706] inline-block" />
                  Direct Farm Income:
                </span>
                <span className="font-semibold">{formatNaira(data.farmIncome)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0F3D24]/5 space-y-6">
      {/* Header & Timeframe Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <TrendingUp className="text-[#3F8F3F]" size={22} />
            <h3 className="text-lg font-bold">Sales & Revenue Line Chart</h3>
            <span className="rounded-full bg-[#3F8F3F]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0F3D24]">
              Real-time
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#0F3D24]/60">
            Track day-by-day and multi-year sales trajectory to easily identify your peak sales periods.
          </p>
        </div>

        {/* Timeframe Selector & Dynamic Year Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-[#F7F5F0] p-1.5 text-xs font-medium border border-[#0F3D24]/10">
            {(
              [
                { key: "24h", label: "24 Hours" },
                { key: "7d", label: "Last 7 Days" },
                { key: "1m", label: "Last Month" },
                { key: "6m", label: "Last 6 Months" },
                { key: "1y", label: "Last Year" },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTimeframe(item.key);
                  setSelectedYear("current");
                }}
                className={`rounded-xl px-3 py-1.5 transition ${
                  timeframe === item.key && selectedYear === "current"
                    ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                    : "text-[#0F3D24]/70 hover:bg-white hover:text-[#0F3D24]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Year Dropdown Selector */}
          <div className="flex items-center gap-1.5 rounded-2xl bg-[#F7F5F0] px-3 py-2 border border-[#0F3D24]/10 text-xs font-semibold text-[#0F3D24]">
            <Calendar size={14} className="text-[#3F8F3F]" />
            <span>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "current") {
                  setSelectedYear("current");
                } else {
                  setSelectedYear(Number(val));
                }
              }}
              className="bg-transparent font-bold outline-none cursor-pointer"
            >
              <option value="current">Recent View</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/60 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F3D24]/60">Total Revenue</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[#0F3D24]">{formatNaira(totalPeriodSales)}</span>
          </div>
          <span className="text-[10px] text-[#0F3D24]/60 block mt-0.5">
            {typeof selectedYear === "number" ? `Full Year ${selectedYear}` : timeframe === "24h" ? "Past 24 hours" : timeframe === "7d" ? "Past 7 days" : timeframe === "1m" ? "Past 30 days" : timeframe === "6m" ? "Past 6 months" : "Past 12 months"}
          </span>
        </div>

        <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/60 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F3D24]/60">Peak Sales Period</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[#3F8F3F]">
              {peakPoint && peakPoint.totalSales > 0 ? formatNaira(peakPoint.totalSales) : "₦0"}
            </span>
          </div>
          <span className="text-[10px] text-[#0F3D24]/60 block mt-0.5 truncate">
            {peakPoint && peakPoint.totalSales > 0 ? `High: ${peakPoint.label}` : "No sales recorded"}
          </span>
        </div>

        <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/60 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F3D24]/60">Average / Bucket</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[#0F3D24]">{formatNaira(averageSales)}</span>
          </div>
          <span className="text-[10px] text-[#0F3D24]/60 block mt-0.5">
            {typeof selectedYear === "number" || timeframe === "6m" || timeframe === "1y" ? "Per month avg" : timeframe === "24h" ? "Per hour avg" : "Per day avg"}
          </span>
        </div>

        <div className="rounded-2xl border border-[#0F3D24]/10 bg-[#F7F5F0]/60 p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0F3D24]/60">Store Orders</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-[#0F3D24]">{totalOrdersCount}</span>
            <span className="text-xs text-[#0F3D24]/60">orders</span>
          </div>
          <span className="text-[10px] text-[#0F3D24]/60 block mt-0.5">
            {formatNaira(totalStoreSales)} in orders
          </span>
        </div>
      </div>

      {/* Main Recharts Line Chart */}
      <div className="w-full pt-2" style={{ minHeight: "300px" }}>
        {ordersQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#0F3D24]/60">
            Loading sales chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0F3D24" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#0F3D24"
                strokeOpacity={0.5}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#0F3D24"
                strokeOpacity={0.5}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `₦${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `₦${(val / 1000).toFixed(0)}k`
                    : `₦${val}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="totalSales"
                name="Total Sales (₦)"
                stroke="#0F3D24"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3F8F3F", stroke: "#0F3D24", strokeWidth: 1.5 }}
                activeDot={{ r: 7, fill: "#0F3D24", stroke: "#3F8F3F", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="storeSales"
                name="Store Orders (₦)"
                stroke="#3F8F3F"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              {financials.some((f) => f.type === "income") && (
                <Line
                  type="monotone"
                  dataKey="farmIncome"
                  name="Direct Farm Income (₦)"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
