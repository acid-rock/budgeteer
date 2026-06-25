import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  monthStringToDate,
  dateToMonthString,
  todayDateString,
  monthRange,
  byKind,
} from "@/lib/utils";

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
