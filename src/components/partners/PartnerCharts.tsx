import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Scale,
  Activity,
  Layers,
} from "lucide-react";
import type { PartnerChartData, Settlement } from "@/lib/partner-settlement";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const compact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${abs}`;
};

const GREEN = "#2e7d32";
const DARK = "#0F3D24";
const RED = "#e11d48";
const GOLD = "#d97706";
const PIE_COLORS = [
  "#0F3D24",
  "#2e7d32",
  "#3F8F3F",
  "#a8e6a8",
  "#d97706",
  "#ea580c",
  "#e11d48",
  "#2563eb",
  "#7c3aed",
];

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur-md">
      {label && <p className="mb-2 font-black text-[#0F3D24] border-b border-slate-100 pb-1">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill || item.stroke }}
              />
              <span className="text-slate-600 font-medium">{item.name}:</span>
            </div>
            <span className="font-extrabold text-[#0F3D24]">
              {formatter ? formatter(item.value, item.name) : naira(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  subtitle,
  badge,
  children,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-[#0F3D24]/10 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#0F3D24]/10 text-[#0F3D24]">
            <Icon size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#0F3D24] tracking-tight">{title}</h4>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#F7F5F0]/40 p-6 text-center text-xs text-slate-500">
      <Layers className="mb-2 text-slate-400" size={28} />
      <span>{text}</span>
    </div>
  );
}

export function PartnerCharts({
  charts,
  settlement,
  partnerLabel = "Partner",
}: {
  charts: PartnerChartData;
  settlement: Settlement;
  partnerLabel?: string;
}) {
  const { flowByWeek, cumulative, expenseByCategory, health } = charts;
  const net = settlement.net;
  const lastNet = cumulative.length ? cumulative[cumulative.length - 1]!.net : 0;
  const isProfitable = lastNet >= 0;
  const trendColor = isProfitable ? GREEN : RED;

  const shareData = [
    {
      name: net < 0 ? "Loss split" : "Profit split",
      [partnerLabel]: settlement.partnerShareAmount,
      Farm: settlement.farmShareAmount,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[#3F8F3F]" />
          <h3 className="text-base font-black text-[#0F3D24]">Visual Analytics & Live Trends</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500">Auto-updated from live records</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Income vs Expenses by Week */}
        <Card
          icon={TrendingUp}
          title="Cash Flow & Operating Movement"
          subtitle="Weekly offload sales vs expenses incurred"
          badge={
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
              {flowByWeek.length} Weeks Recorded
            </span>
          }
        >
          {flowByWeek.length === 0 ? (
            <Empty text="No income or expenses recorded yet for this cycle." />
          ) : (
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowByWeek} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis
                    tickFormatter={compact}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    iconType="circle"
                  />
                  <Bar dataKey="expenses" name="Expenses" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="income" name="Sales / Income" fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 2. Cumulative Profit / Loss Trend */}
        <Card
          icon={isProfitable ? TrendingUp : TrendingDown}
          title="Running Operational Net Result"
          subtitle="Cycle cumulative position (Above line = Net Profit)"
          badge={
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold border ${
                isProfitable
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              Current: {naira(lastNet)}
            </span>
          }
        >
          {cumulative.length === 0 ? (
            <Empty text="The cumulative trend appears as transactions are logged." />
          ) : (
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulative} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trendColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis
                    tickFormatter={compact}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => [naira(v), "Net Result"]} />} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Area
                    type="monotone"
                    dataKey="net"
                    name="Net Position"
                    stroke={trendColor}
                    strokeWidth={3}
                    fill="url(#netFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* 3. Expense Breakdown by Category */}
        <Card
          icon={PieIcon}
          title="Expense Distribution by Category"
          subtitle="Allocation of capital across procurement, feed, and pen costs"
          badge={
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
              {expenseByCategory.length} Cost Centers
            </span>
          }
        >
          {expenseByCategory.length === 0 ? (
            <Empty text="No expenses recorded yet." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full space-y-2 text-xs">
                {expenseByCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-1.5">
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="truncate text-slate-700 font-medium">{c.name}</span>
                    </span>
                    <span className="shrink-0 font-extrabold text-[#0F3D24]">
                      {c.percent}% <span className="font-normal text-slate-500 text-[10px]">({naira(c.value)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* 4. Profit / Loss Partitioning Share */}
        <Card
          icon={Scale}
          title={net < 0 ? "Loss Allocation Bar" : "Profit Sharing Allocation"}
          subtitle={
            net === 0
              ? "Operations currently breaking even."
              : `${partnerLabel}: ${settlement.appliedSharePercent}% · Farm: ${100 - settlement.appliedSharePercent}%`
          }
          badge={
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 border border-emerald-200">
              {settlement.appliedSharePercent}% / {100 - settlement.appliedSharePercent}%
            </span>
          }
        >
          {net === 0 ? (
            <Empty text="The sharing bar renders once cycle records positive profit or loss." />
          ) : (
            <div className="space-y-4 pt-2">
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shareData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                    <Bar
                      dataKey={partnerLabel}
                      stackId="a"
                      fill={net < 0 ? RED : GREEN}
                      radius={[8, 0, 0, 8]}
                      maxBarSize={32}
                    />
                    <Bar dataKey="Farm" stackId="a" fill={DARK} radius={[0, 8, 8, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-xs">
                <div
                  className={`rounded-2xl p-3 border ${
                    net < 0 ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    {partnerLabel} ({settlement.appliedSharePercent}%)
                  </span>
                  <span
                    className={`text-base font-black ${net < 0 ? "text-rose-900" : "text-emerald-900"}`}
                  >
                    {naira(settlement.partnerShareAmount)}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#F7F5F0] p-3 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Farm Retained ({100 - settlement.appliedSharePercent}%)
                  </span>
                  <span className="text-base font-black text-[#0F3D24]">
                    {naira(settlement.farmShareAmount)}
                  </span>
                </div>
              </div>

              {settlement.lossWasCapped && (
                <p className="rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-900 border border-amber-200">
                  Loss protection active: partner loss capped at initial investment. The farm absorbs the remainder.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* 5. Flock Health, Mortality & Feeding */}
        <div className="lg:col-span-2">
          <Card
            icon={Activity}
            title="Flock Biomass, Feed Consumption & Health Metrics"
            subtitle="Daily feed intake (kg), mortality count, and live bird census"
            badge={
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold text-blue-800 border border-blue-200">
                Daily Activity Stream
              </span>
            }
          >
            {health.length === 0 ? (
              <Empty text="No daily activity logs recorded yet. Stock headcount and feeding appear once logged." />
            ) : (
              <div className="h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={health} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} iconType="circle" />
                    <Bar
                      yAxisId="left"
                      dataKey="mortality"
                      name="Mortality (birds)"
                      fill={RED}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="feedKg"
                      name="Feed Intake (kg)"
                      fill={GOLD}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="liveBirds"
                      name="Live Bird Count"
                      stroke={DARK}
                      strokeWidth={3}
                      dot={{ r: 4, fill: DARK }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
