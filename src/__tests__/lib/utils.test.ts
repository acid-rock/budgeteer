import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  monthStringToDate,
  dateToMonthString,
  todayDateString,
  monthRange,
  priorMonthsRange,
  percentDelta,
  overBudgetCategories,
  byKind,
} from "@/lib/utils";
import type { CategoryReportRow } from "@/types";

describe("formatCurrency", () => {
  it("formats a positive peso amount with thousands separator", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1,234");
    expect(result).toContain("56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toContain("0");
  });

  it("formats a large amount", () => {
    const result = formatCurrency(1000000);
    expect(result).toContain("1,000,000");
  });
});

describe("formatDate", () => {
  it("formats a UTC date as seen in Manila (UTC+8)", () => {
    // 2026-05-31T16:00:00Z = June 1, 2026 00:00 Manila
    const result = formatDate(new Date("2026-05-31T16:00:00.000Z"));
    expect(result).toContain("Jun");
    expect(result).toContain("1");
    expect(result).toContain("2026");
  });

  it("accepts a string date", () => {
    const result = formatDate("2026-03-15T00:00:00.000Z");
    expect(result).toContain("2026");
  });

  it("a date well within the same day shows the same UTC and Manila calendar day", () => {
    // Noon UTC = 8pm Manila — same calendar day
    const result = formatDate(new Date("2026-06-15T04:00:00.000Z"));
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });
});

describe("monthStringToDate", () => {
  it("converts '2026-05' to the UTC first day of May 2026", () => {
    const d = monthStringToDate("2026-05");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(4); // 0-indexed
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
  });

  it("handles January (month 01)", () => {
    const d = monthStringToDate("2026-01");
    expect(d.getUTCMonth()).toBe(0);
  });

  it("handles December (month 12)", () => {
    const d = monthStringToDate("2026-12");
    expect(d.getUTCMonth()).toBe(11);
  });
});

describe("dateToMonthString", () => {
  it("returns the correct month string for a date in the middle of the month", () => {
    // 2026-05-15 00:00 UTC = 2026-05-15 08:00 Manila → still May
    expect(dateToMonthString(new Date("2026-05-15T00:00:00.000Z"))).toBe("2026-05");
  });

  it("accounts for UTC+8 offset — late UTC night rolls over to the next day in Manila", () => {
    // 2026-05-31 17:00 UTC = 2026-06-01 01:00 Manila → June, not May
    expect(dateToMonthString(new Date("2026-05-31T17:00:00.000Z"))).toBe("2026-06");
  });
});

describe("todayDateString", () => {
  it("returns a YYYY-MM-DD string for a mid-month UTC date", () => {
    expect(todayDateString(new Date("2026-05-15T00:00:00.000Z"))).toBe("2026-05-15");
  });

  it("returns the Manila calendar date, not the UTC date, for late-night UTC timestamps", () => {
    // 2026-05-31 17:00 UTC = 2026-06-01 01:00 Manila
    expect(todayDateString(new Date("2026-05-31T17:00:00.000Z"))).toBe("2026-06-01");
  });
});

describe("monthRange", () => {
  it("returns the UTC midnight start and exclusive end of a month", () => {
    const { start, end } = monthRange("2026-05");
    expect(start).toEqual(new Date("2026-05-01T00:00:00.000Z"));
    expect(end).toEqual(new Date("2026-06-01T00:00:00.000Z"));
  });

  it("handles December — end is January 1 of the following year", () => {
    const { start, end } = monthRange("2026-12");
    expect(start).toEqual(new Date("2026-12-01T00:00:00.000Z"));
    expect(end).toEqual(new Date("2027-01-01T00:00:00.000Z"));
  });

  it("end is the first day of the next month at UTC midnight (exclusive boundary)", () => {
    const { end } = monthRange("2026-01");
    expect(end.getUTCMonth()).toBe(1); // February
    expect(end.getUTCDate()).toBe(1);
    expect(end.getUTCHours()).toBe(0);
  });
});

describe("priorMonthsRange", () => {
  it("for n=1 spans exactly the prior calendar month (end = first of `month`)", () => {
    const { start, end } = priorMonthsRange("2026-05", 1);
    expect(start).toEqual(new Date("2026-04-01T00:00:00.000Z"));
    expect(end).toEqual(new Date("2026-05-01T00:00:00.000Z"));
  });

  it("crosses a year boundary (January → prior December)", () => {
    const { start, end } = priorMonthsRange("2026-01", 1);
    expect(start).toEqual(new Date("2025-12-01T00:00:00.000Z"));
    expect(end).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });
});

describe("percentDelta", () => {
  it("computes a rounded positive change", () => {
    expect(percentDelta(110, 100)).toBe(10);
  });

  it("computes a negative change", () => {
    expect(percentDelta(90, 100)).toBe(-10);
  });

  it("returns 0 when unchanged", () => {
    expect(percentDelta(100, 100)).toBe(0);
  });

  it("returns null when there is no prior baseline (avoids divide-by-zero)", () => {
    expect(percentDelta(50, 0)).toBeNull();
  });

  it("rounds to the nearest whole percent", () => {
    expect(percentDelta(127, 100)).toBe(27);
    expect(percentDelta(1265, 1000)).toBe(27); // 26.5 → 27
  });
});

describe("overBudgetCategories", () => {
  const row = (over: Partial<CategoryReportRow>): CategoryReportRow => ({
    categoryId: "c",
    categoryName: "Cat",
    spent: 0,
    limit: null,
    ...over,
  });

  it("includes categories at OR over their limit", () => {
    const rows = [
      row({ categoryId: "at", spent: 100, limit: 100 }), // exactly at limit
      row({ categoryId: "over", spent: 150, limit: 100 }),
      row({ categoryId: "under", spent: 80, limit: 100 }),
    ];
    expect(overBudgetCategories(rows).map((r) => r.categoryId)).toEqual(["at", "over"]);
  });

  it("ignores categories with no budget or a zero limit", () => {
    const rows = [
      row({ categoryId: "nolimit", spent: 500, limit: null }),
      row({ categoryId: "zero", spent: 500, limit: 0 }),
    ];
    expect(overBudgetCategories(rows)).toEqual([]);
  });
});

describe("byKind", () => {
  const cats = [
    { id: "a", kind: "income" as const },
    { id: "b", kind: "expense" as const },
    { id: "c", kind: "expense" as const },
    { id: "d", kind: "savings" as const },
  ];

  it("returns only the categories matching the given kind", () => {
    expect(byKind(cats, "expense").map((c) => c.id)).toEqual(["b", "c"]);
    expect(byKind(cats, "income").map((c) => c.id)).toEqual(["a"]);
    expect(byKind(cats, "savings").map((c) => c.id)).toEqual(["d"]);
  });

  it("returns an empty array for an undefined list", () => {
    expect(byKind(undefined, "expense")).toEqual([]);
  });
});
