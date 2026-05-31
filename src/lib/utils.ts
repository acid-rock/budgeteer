// Shared formatting + date helpers. Keep these pure and dependency-free.

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

// "2026-05" -> Date for the first day of that month (UTC).
export function monthStringToDate(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1));
}

// Date -> "2026-05" (UTC).
export function dateToMonthString(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// Inclusive start / exclusive end of a month, given "2026-05".
export function monthRange(month: string): { start: Date; end: Date } {
  const start = monthStringToDate(month);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}
