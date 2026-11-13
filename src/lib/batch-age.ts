const DAY_MS = 86_400_000;
const lagosDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Lagos",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Batch start dates are calendar dates; age advances at Lagos midnight. */
export function completedBatchWeeks(startDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isFinite(now.getTime())) return null;
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  if (!Number.isFinite(startMs) || new Date(startMs).toISOString().slice(0, 10) !== startDate)
    return null;

  const parts = lagosDate.formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  const todayMs = Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
  return Math.floor(Math.max(0, todayMs - startMs) / (DAY_MS * 7));
}
