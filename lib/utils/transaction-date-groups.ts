export type TransactionDateGroupKey = "today" | "thisWeek" | "earlier";

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Start of calendar week (Monday) for the given date. */
export function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const weekday = day.getDay(); // 0 Sun … 6 Sat
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  day.setDate(day.getDate() - daysFromMonday);
  return day;
}

/**
 * Group boundaries (local time):
 * - Today: same calendar day as now
 * - This Week: same Monday–Sunday week as now, excluding today
 * - Earlier: before the start of this week
 */
export function getTransactionDateGroupKey(
  date: Date,
  now = new Date()
): TransactionDateGroupKey {
  const d = startOfDay(date);
  const today = startOfDay(now);
  const weekStart = startOfWeek(now);

  if (d.getTime() === today.getTime()) return "today";
  if (d.getTime() >= weekStart.getTime() && d.getTime() < today.getTime()) {
    return "thisWeek";
  }
  return "earlier";
}
