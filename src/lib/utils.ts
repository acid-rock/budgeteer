// Shared formatting + date helpers. Keep these pure and dependency-free
// (the only import is a type, which is erased at build time).

import type { CategoryKind, CategoryReportRow } from "@/types";

// Single-user app based in the Philippines. "Current" dates (this month, today)
// are computed in this zone so they match the user's wall clock regardless of
// where the code runs — the browser, local dev, or a UTC server (e.g. Vercel).
export const APP_TIME_ZONE = "Asia/Manila";

// Extract Y/M/D of a date as seen in APP_TIME_ZONE. Uses formatToParts so it's
// robust to locale ordering.
function partsInAppZone(date: Date): { y: string; m: string; d: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  // The non-null assertion is safe: formatToParts always emits a part for every
  // field requested above, so find() never returns undefined for year/month/day.
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

// "2026-05" -> Date for the first day of that month (UTC). This UTC anchor is
// how months are stored (budgets) and queried (transaction ranges).
export function monthStringToDate(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1));
}

// Current calendar month in the app timezone, as "2026-05".
export function dateToMonthString(date: Date = new Date()): string {
  const { y, m } = partsInAppZone(date);
  return `${y}-${m}`;
}

// Today's date in the app timezone, as "2026-05-31" (for <input type="date">).
export function todayDateString(date: Date = new Date()): string {
  const { y, m, d } = partsInAppZone(date);
  return `${y}-${m}-${d}`;
}

// Inclusive start / exclusive end of a month, given "2026-05".
export function monthRange(month: string): { start: Date; end: Date } {
  const start = monthStringToDate(month);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

// The `n` whole calendar months immediately before `month` (e.g. for a rolling
// average): `end` is the first day of `month` (UTC, exclusive), `start` is the
// first day `n` months earlier (UTC, inclusive). For "2026-05", n=3 →
// [2026-02-01, 2026-05-01). Uses the same UTC anchoring as monthStringToDate.
export function priorMonthsRange(
  month: string,
  n: number
): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, m - 1, 1));
  const start = new Date(Date.UTC(year, m - 1 - n, 1));
  return { start, end };
}

// Percentage change from `prior` to `current`, rounded to a whole percent.
// Returns null when there's no baseline (prior is 0) — a percent change from
// zero is undefined, so callers show "no prior data" rather than a bogus number.
export function percentDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

// Categories whose spend has reached or passed their budget limit — the overspend
// warning surfaced in Reports. Uses ≥ (at OR over limit) and ignores categories
// with no positive limit.
export function overBudgetCategories(
  rows: CategoryReportRow[]
): CategoryReportRow[] {
  return rows.filter(
    (r) => r.limit != null && r.limit > 0 && r.spent >= r.limit
  );
}

// Income / expense / savings categories are filtered by `kind` all over the app
// (transaction forms, budgets, …). Returns [] for an undefined list, matching the
// call sites' previous `?? []`.
export function byKind<T extends { kind: CategoryKind }>(
  categories: T[] | undefined,
  kind: CategoryKind
): T[] {
  return categories?.filter((c) => c.kind === kind) ?? [];
}
