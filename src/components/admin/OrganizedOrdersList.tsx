import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
  FolderArchive,
  ArrowUpDown,
  ShoppingBag,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { AdminOrder, AdminRole } from "@/lib/orders.functions";
import type { FarmBatch } from "@/lib/farm.functions";
import { OrderRow } from "@/routes/admin.admin-orders";

interface OrganizedOrdersListProps {
  orders: AdminOrder[];
  passcode: string;
  role: AdminRole;
  batches?: FarmBatch[];
  onSaved: () => void;
  onOpenSmsModal?: (order: AdminOrder) => void;
}

const formatNaira = (val: number) =>
  "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

type TimeFilter = "all" | "today" | "yesterday" | "last_week" | "month";

interface SectionGroup {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  orders: AdminOrder[];
  totalRevenue: number;
  defaultExpanded: boolean;
}

export function OrganizedOrdersList({ orders, passcode, role, batches, onSaved, onOpenSmsModal }: OrganizedOrdersListProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    today: true,
    yesterday: true,
  });

  // Group orders chronologically: Today, Yesterday, Last Week, Month
  const { groups, availableMonths } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const lastWeekStart = todayStart - 6 * 86400000;

    const todayOrders: AdminOrder[] = [];
    const yesterdayOrders: AdminOrder[] = [];
    const lastWeekOrders: AdminOrder[] = [];
    const monthMap = new Map<string, AdminOrder[]>();

    orders.forEach((o) => {
      const orderTime = new Date(o.createdAt).getTime();

      if (orderTime >= todayStart) {
        todayOrders.push(o);
      } else if (orderTime >= yesterdayStart) {
        yesterdayOrders.push(o);
      } else if (orderTime >= lastWeekStart) {
        lastWeekOrders.push(o);
      } else {
        const d = new Date(o.createdAt);
        const monthKey = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, []);
        }
        monthMap.get(monthKey)!.push(o);
      }
    });

    const monthKeys = Array.from(monthMap.keys());

    const resultGroups: SectionGroup[] = [
      {
        key: "today",
        title: "Today's Orders",
        subtitle: new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        icon: <Calendar className="text-[#3F8F3F]" size={18} />,
        orders: todayOrders,
        totalRevenue: todayOrders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total || 0 : 0), 0),
        defaultExpanded: true,
      },
      {
        key: "yesterday",
        title: "Yesterday's Orders",
        subtitle: new Date(Date.now() - 86400000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        icon: <Clock className="text-[#0F3D24]" size={18} />,
        orders: yesterdayOrders,
        totalRevenue: yesterdayOrders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total || 0 : 0), 0),
        defaultExpanded: true,
      },
      {
        key: "last_week",
        title: "Last Week (Past 7 Days)",
        subtitle: "Earlier this week",
        icon: <Layers className="text-amber-600" size={18} />,
        orders: lastWeekOrders,
        totalRevenue: lastWeekOrders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total || 0 : 0), 0),
        defaultExpanded: false,
      },
    ];

    // Add Month sections
    monthMap.forEach((mOrders, monthKey) => {
      resultGroups.push({
        key: `month_${monthKey}`,
        title: monthKey,
        subtitle: "Monthly Archive",
        icon: <FolderArchive className="text-blue-600" size={18} />,
        orders: mOrders,
        totalRevenue: mOrders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total || 0 : 0), 0),
        defaultExpanded: false,
      });
    });

    return { groups: resultGroups, availableMonths: monthKeys };
  }, [orders]);

  // Toggle single group expand/collapse
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? !groups.find((g) => g.key === key)?.defaultExpanded : !prev[key],
    }));
  };

  const isExpanded = (group: SectionGroup) => {
    if (expandedGroups[group.key] !== undefined) {
      return expandedGroups[group.key];
    }
    return group.defaultExpanded;
  };

  // Expand All / Collapse All
  const expandAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => {
      next[g.key] = true;
    });
    setExpandedGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => {
      next[g.key] = false;
    });
    setExpandedGroups(next);
  };

  // Filter groups according to top time filter selection
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (timeFilter === "all") return true;
      if (timeFilter === "today") return g.key === "today";
      if (timeFilter === "yesterday") return g.key === "yesterday";
      if (timeFilter === "last_week") return g.key === "last_week";
      if (timeFilter === "month") {
        if (!g.key.startsWith("month_")) return false;
        if (selectedMonth !== "all") {
          return g.key === `month_${selectedMonth}`;
        }
        return true;
      }
      return true;
    });
  }, [groups, timeFilter, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Control Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#0F3D24]/5">
        <div>
          <div className="flex items-center gap-2 text-[#0F3D24]">
            <ShoppingBag className="text-[#3F8F3F]" size={20} />
            <h3 className="text-base font-bold">Organized Orders & Reports</h3>
            <span className="rounded-full bg-[#0F3D24]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0F3D24]">
              {orders.length} Total Orders
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#0F3D24]/60">
            Grouped by Today, Yesterday, Last Week, and Month filters. Tap any order row to expand items, timeline, and actions.
          </p>
        </div>

        {/* Time Filters Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-[#F7F5F0] p-1 text-xs font-medium border border-[#0F3D24]/10">
            <button
              onClick={() => setTimeFilter("all")}
              className={`rounded-xl px-3 py-1.5 transition ${
                timeFilter === "all"
                  ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                  : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFilter("today")}
              className={`rounded-xl px-3 py-1.5 transition ${
                timeFilter === "today"
                  ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                  : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter("yesterday")}
              className={`rounded-xl px-3 py-1.5 transition ${
                timeFilter === "yesterday"
                  ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                  : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setTimeFilter("last_week")}
              className={`rounded-xl px-3 py-1.5 transition ${
                timeFilter === "last_week"
                  ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                  : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setTimeFilter("month")}
              className={`rounded-xl px-3 py-1.5 transition ${
                timeFilter === "month"
                  ? "bg-[#0F3D24] font-semibold text-white shadow-sm"
                  : "text-[#0F3D24]/70 hover:text-[#0F3D24]"
              }`}
            >
              Month Filter
            </button>
          </div>

          {/* Month Dropdown Filter when Month Filter is active */}
          {timeFilter === "month" && availableMonths.length > 0 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-2xl border border-[#0F3D24]/15 bg-white px-3 py-1.5 text-xs font-semibold text-[#0F3D24] outline-none focus:border-[#3F8F3F]"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {/* Expand/Collapse All Buttons */}
          <div className="flex items-center gap-1 border-l border-[#0F3D24]/10 pl-2">
            <button
              onClick={expandAll}
              title="Expand All Sections"
              className="flex items-center gap-1 rounded-xl border border-[#0F3D24]/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F3D24] hover:bg-[#F7F5F0]"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">Expand</span>
            </button>
            <button
              onClick={collapseAll}
              title="Collapse All Sections"
              className="flex items-center gap-1 rounded-xl border border-[#0F3D24]/10 bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F3D24] hover:bg-[#F7F5F0]"
            >
              <Minimize2 size={13} />
              <span className="hidden sm:inline">Collapse</span>
            </button>
          </div>
        </div>
      </div>

      {/* Render Accordion Groups */}
      {filteredGroups.length === 0 || orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-[#0F3D24]/5">
          <FileText size={36} className="mx-auto text-[#0F3D24]/30" />
          <p className="mt-3 font-semibold text-[#0F3D24]">No orders match the selected time filter.</p>
          <p className="mt-1 text-xs text-[#0F3D24]/60">Try switching to "All Time" to view all records.</p>
          <button
            onClick={() => {
              setTimeFilter("all");
              setSelectedMonth("all");
            }}
            className="mt-4 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-semibold text-white hover:bg-[#134a2c]"
          >
            Show All Orders
          </button>
        </div>
      ) : (
        filteredGroups.map((group) => {
          const expanded = isExpanded(group);
          const hasOrders = group.orders.length > 0;

          // If filtering specifically by time and group is empty, hide group unless viewing all
          if (!hasOrders && timeFilter !== "all") return null;

          return (
            <div
              key={group.key}
              className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-[#0F3D24]/10 transition"
            >
              {/* Group Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className={`flex w-full items-center justify-between gap-4 p-4 text-left transition ${
                  expanded ? "bg-[#F7F5F0]/80 border-b border-[#0F3D24]/10" : "hover:bg-[#F7F5F0]/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#0F3D24]/10">
                    {group.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#0F3D24] sm:text-base">{group.title}</h4>
                      <span className="rounded-full bg-[#0F3D24]/10 px-2.5 py-0.5 text-xs font-bold text-[#0F3D24]">
                        {group.orders.length} {group.orders.length === 1 ? "order" : "orders"}
                      </span>
                    </div>
                    <span className="text-xs text-[#0F3D24]/60">{group.subtitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {group.totalRevenue > 0 && (
                    <div className="text-right">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-[#0F3D24]/50">
                        Sales Value
                      </span>
                      <span className="text-sm font-extrabold text-[#3F8F3F]">
                        {formatNaira(group.totalRevenue)}
                      </span>
                    </div>
                  )}

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0F3D24]/70 ring-1 ring-[#0F3D24]/10">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Group Content Body */}
              {expanded && (
                <div className="p-4 sm:p-6 space-y-4">
                  {group.orders.length === 0 ? (
                    <p className="py-4 text-center text-xs text-[#0F3D24]/50">
                      No orders recorded for this period.
                    </p>
                  ) : (
                    group.orders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        passcode={passcode}
                        role={role}
                        batches={batches}
                        onSaved={onSaved}
                        onOpenSmsModal={onOpenSmsModal}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
