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
import type { PartnerChartData, Settlement } from "@/lib/partner-settlement";

const naira = (n: number) => "\u20a6" + Math.round(n || 0).toLocaleString("en-NG");
const compact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${abs}`;
};

const GREEN = "#3F8F3F";
const DARK = "#0F3D24";
const RED = "#dc2626";
const PIE_COLORS = ["#0F3D24", "#3F8F3F", "#a8e6a8", "#E6B800", "#f97316", "#dc2626", "#3b82f6", "#8b5cf6", "#64748b"];

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm ring-1 ring-[#0F3D24]/10">
      <h4 className="text-sm font-black text-[#0F3D24]">{title}</h4>
      {subtitle && <p className="text-[11px] text-slate-500 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 px-4">
      {text}
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
  const trendColor = lastNet >= 0 ? GREEN : RED;

  const shareData = [
    {
      name: net < 0 ? "Loss split" : "Profit split",
      [partnerLabel]: settlement.partnerShareAmount,
      "Farm": settlement.farmShareAmount,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 1. Income vs Expenses */}
      <Card title="Income vs Expenses" subtitle="Weekly cash movement for this investment">
        {flowByWeek.length === 0 ? (
          <Empty text="No income or expenses recorded yet." />
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowByWeek} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => naira(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expenses" name="Expenses" fill={RED} radius={[4, 4, 0, 0]} />
                <Bar dataKey="income" name="Income / Sales" fill={GREEN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 2. Cumulative profit / loss */}
      <Card title="Running Profit / Loss" subtitle="Cumulative net result over the cycle (above zero = profit)">
        {cumulative.length === 0 ? (
          <Empty text="The running result appears once entries are recorded." />
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulative} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [naira(v), "Net result"]} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="net" stroke={trendColor} strokeWidth={2.5} fill="url(#netFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* 3. Expense breakdown */}
      <Card title="Where the Money Went" subtitle="Expenses by category, as % of total cost">
        {expenseByCategory.length === 0 ? (
          <Empty text="No expenses recorded yet." />
        ) : (
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => naira(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full space-y-1.5 text-xs">
              {expenseByCategory.map((c, i) => (
                <li key={c.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="truncate text-slate-700">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-[#0F3D24]">
                    {c.percent}% <span className="font-medium text-slate-500">· {naira(c.value)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* 4. Share split */}
      <Card
        title={net < 0 ? "Who Bears the Loss" : "How the Profit Is Shared"}
        subtitle={
          net === 0
            ? "Nothing to split yet."
            : `${partnerLabel} ${net < 0 ? "bears" : "receives"} ${settlement.appliedSharePercent}% · Farm ${
                net < 0 ? "bears" : "keeps"
              } ${100 - settlement.appliedSharePercent}%`
        }
      >
        {net === 0 ? (
          <Empty text="The split appears once the cycle shows a profit or a loss." />
        ) : (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shareData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip formatter={(v: number) => naira(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={partnerLabel} stackId="a" fill={net < 0 ? RED : GREEN} radius={[6, 0, 0, 6]} />
                <Bar dataKey="Farm" stackId="a" fill={DARK} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {settlement.lossWasCapped && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] font-semibold text-amber-900">
            Loss protection applied: the partner's loss is capped at the capital invested; the farm absorbs the rest.
          </p>
        )}
      </Card>

      {/* 5. Mortality & feed */}
      <div className="lg:col-span-2">
        <Card title="Flock Health & Feed" subtitle="Live birds, daily mortality, and feed consumed (kg)">
          {health.length === 0 ? (
            <Empty text="No daily activity logged yet." />
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={health} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="mortality" name="Mortality (birds)" fill={RED} radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="feedKg" name="Feed (kg)" fill="#E6B800" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="liveBirds"
                    name="Live birds"
                    stroke={DARK}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
