import { describe, it, expect } from "vitest";
import { csvEscape, toCsvRow, transactionCsvFields } from "@/lib/csv";

describe("csvEscape", () => {
  it("leaves a plain value unquoted", () => {
    expect(csvEscape("Groceries")).toBe("Groceries");
  });

  it("quotes a value containing a comma", () => {
    expect(csvEscape("Dining, out")).toBe('"Dining, out"');
  });

  it("doubles internal quotes and wraps in quotes", () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes a value containing a newline", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsvRow", () => {
  it("escapes fields, stringifies numbers, and comma-joins", () => {
    expect(toCsvRow(["2026-06-26", "expense", "Food, drink", "", 12.5])).toBe(
      '2026-06-26,expense,"Food, drink",,12.5'
    );
  });
});

describe("transactionCsvFields", () => {
  it("maps to column order, rendering a null note as empty", () => {
    expect(
      transactionCsvFields({
        date: "2026-06-26",
        type: "income",
        categoryName: "Salary",
        note: null,
        amount: 5000,
      })
    ).toEqual(["2026-06-26", "income", "Salary", "", 5000]);
  });
});
