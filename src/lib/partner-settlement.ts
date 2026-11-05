// Pure, dependency-free settlement math shared by the admin workspace and the
// partner portal so BOTH sides always see identical numbers.

export interface SettlementTerms {
  initialInvestment: number;
  /** Partner's cut of profit, 0-100 */
  profitSharePercentage: number;
  /** Share of loss the partner absorbs, 0-100 (always capped at capital) */
  lossSharePercentage: number;
}

export interface SettlementEntry {
  type: "expense" | "income" | "payout";
  amount: number;
  /** Soft-deleted entries are ignored by all math */
  removedAt?: string | null;
}

export interface Settlement {
  totalExpenses: number;
  totalIncome: number;
  /** income - expenses */
  net: number;
  result: "profit" | "loss" | "breakeven";
  partnerShareAmount: number; // always >= 0 (profit received OR loss borne)
  farmShareAmount: number; // always >= 0
  /** Signed: + profit, - loss */
  partnerSignedResult: number;
  /** Signed ROI on capital, in percent */
  roiPercent: number;
  /** Partner's own share of net as % of net (the % actually applied) */
  appliedSharePercent: number;
  lossWasCapped: boolean;
  capitalDeployed: number; // = expenses (partner funds expenses)
  capitalRemaining: number; // capital - expenses (can be negative = overspend)
  payoutDue: number; // capital +/- partner result, never below 0
  paidOut: number;
  balanceOwed: number; // payoutDue - paidOut
  payoutProgressPercent: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));

export function computeSettlement(terms: SettlementTerms, entries: SettlementEntry[]): Settlement {
  const capital = Math.max(0, Number(terms.initialInvestment) || 0);
  const profitPct = clampPct(terms.profitSharePercentage);
  const lossPct = clampPct(terms.lossSharePercentage);

  let totalExpenses = 0;
  let totalIncome = 0;
  let paidOut = 0;
  for (const e of entries) {
    if (e.removedAt) continue;
    const amt = Number(e.amount) || 0;
    if (e.type === "expense") totalExpenses += amt;
    else if (e.type === "income") totalIncome += amt;
    else if (e.type === "payout") paidOut += amt;
  }

  const net = totalIncome - totalExpenses;
  let partnerShareAmount = 0;
  let farmShareAmount = 0;
  let partnerSignedResult = 0;
  let lossWasCapped = false;
  let result: Settlement["result"] = "breakeven";
  let appliedSharePercent = 0;

  if (net > 0) {
    result = "profit";
    partnerShareAmount = net * (profitPct / 100);
    farmShareAmount = net - partnerShareAmount;
    partnerSignedResult = partnerShareAmount;
    appliedSharePercent = profitPct;
  } else if (net < 0) {
    result = "loss";
    const loss = Math.abs(net);
    let borne = loss * (lossPct / 100);
    if (borne > capital) {
      borne = capital; // partner can never lose more than they invested
      lossWasCapped = true;
    }
    partnerShareAmount = borne;
    farmShareAmount = loss - borne;
    partnerSignedResult = -borne;
    appliedSharePercent = lossPct;
  }

  const payoutDue = Math.max(0, capital + partnerSignedResult);
  const roiPercent = capital > 0 ? (partnerSignedResult / capital) * 100 : 0;
  const balanceOwed = payoutDue - paidOut;

  return {
    totalExpenses: round2(totalExpenses),
    totalIncome: round2(totalIncome),
    net: round2(net),
    result,
    partnerShareAmount: round2(partnerShareAmount),
    farmShareAmount: round2(farmShareAmount),
    partnerSignedResult: round2(partnerSignedResult),
    roiPercent: round2(roiPercent),
    appliedSharePercent,
    lossWasCapped,
    capitalDeployed: round2(totalExpenses),
    capitalRemaining: round2(capital - totalExpenses),
    payoutDue: round2(payoutDue),
    paidOut: round2(paidOut),
    balanceOwed: round2(balanceOwed),
    payoutProgressPercent: payoutDue > 0 ? Math.min(100, round2((paidOut / payoutDue) * 100)) : 0,
  };
}

// ─── Chart series ─────────────────────────────────────────────────────────────

export interface ChartEntry extends SettlementEntry {
  category: string;
  transactionDate: string;
}

export interface ChartActivity {
  activityDate: string;
  stockHeadcount: number;
  mortalityCount: number;
  feedConsumedKg: number;
  removedAt?: string | null;
}

export interface PartnerChartData {
  /** Income vs expenses bucketed by week (Monday start) */
  flowByWeek: { label: string; income: number; expenses: number }[];
  /** Running net over time */
  cumulative: { label: string; net: number }[];
  /** Expense totals per category */
  expenseByCategory: { name: string; value: number; percent: number }[];
  /** Mortality / feed per day */
  health: { label: string; mortality: number; feedKg: number; liveBirds: number }[];
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

const shortDate = (s: string) => {
  const d = new Date(s + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

export function buildChartData(entries: ChartEntry[], activities: ChartActivity[]): PartnerChartData {
  const live = entries.filter((e) => !e.removedAt && e.type !== "payout");

  const weekMap = new Map<string, { income: number; expenses: number }>();
  for (const e of live) {
    const k = weekStart(e.transactionDate);
    const cur = weekMap.get(k) || { income: 0, expenses: 0 };
    if (e.type === "income") cur.income += e.amount;
    else cur.expenses += e.amount;
    weekMap.set(k, cur);
  }
  const weekKeys = [...weekMap.keys()].sort();
  const flowByWeek = weekKeys.map((k) => ({
    label: "Wk " + shortDate(k),
    income: round2(weekMap.get(k)!.income),
    expenses: round2(weekMap.get(k)!.expenses),
  }));

  let running = 0;
  const cumulative = [...live]
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))
    .map((e) => {
      running += e.type === "income" ? e.amount : -e.amount;
      return { label: shortDate(e.transactionDate), net: round2(running) };
    });

  const catMap = new Map<string, number>();
  let totalExp = 0;
  for (const e of live) {
    if (e.type !== "expense") continue;
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    totalExp += e.amount;
  }
  const expenseByCategory = [...catMap.entries()]
    .map(([name, value]) => ({
      name,
      value: round2(value),
      percent: totalExp > 0 ? round2((value / totalExp) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const acts = activities.filter((a) => !a.removedAt).sort((a, b) => a.activityDate.localeCompare(b.activityDate));
  let birds = 0;
  const dayMap = new Map<string, { mortality: number; feedKg: number; liveBirds: number }>();
  for (const a of acts) {
    birds += (a.stockHeadcount || 0) - (a.mortalityCount || 0);
    const cur = dayMap.get(a.activityDate) || { mortality: 0, feedKg: 0, liveBirds: 0 };
    cur.mortality += a.mortalityCount || 0;
    cur.feedKg += a.feedConsumedKg || 0;
    cur.liveBirds = Math.max(0, birds);
    dayMap.set(a.activityDate, cur);
  }
  const health = [...dayMap.entries()].map(([k, v]) => ({
    label: shortDate(k),
    mortality: v.mortality,
    feedKg: round2(v.feedKg),
    liveBirds: v.liveBirds,
  }));

  return { flowByWeek, cumulative, expenseByCategory, health };
}
