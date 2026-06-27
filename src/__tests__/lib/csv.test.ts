import { describe, it, expect } from "vitest";
import {
  csvEscape,
  toCsvRow,
  transactionCsvFields,
  parseCsv,
  mapCsvColumns,
} from "@/lib/csv";

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

describe("parseCsv", () => {
  it("splits simple rows on commas and newlines", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings and a trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsv("﻿Date,Amount\n2026-01-01,5")).toEqual([
      ["Date", "Amount"],
      ["2026-01-01", "5"],
    ]);
  });

  it("unwraps quoted fields with commas, doubled quotes, and newlines", () => {
    const text = 'note\n"Food, drink"\n"say ""hi"""\n"line1\nline2"';
    expect(parseCsv(text)).toEqual([
      ["note"],
      ["Food, drink"],
      ['say "hi"'],
      ["line1\nline2"],
    ]);
  });

  it("round-trips a row built by toCsvRow", () => {
    const line = toCsvRow(["2026-06-26", "expense", "Food, drink", 'a "b"', 12.5]);
    expect(parseCsv(line)).toEqual([
      ["2026-06-26", "expense", "Food, drink", 'a "b"', "12.5"],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("mapCsvColumns", () => {
  it("maps the export header case-insensitively in any order", () => {
    const { map, missing } = mapCsvColumns(["Amount", "type", "DATE", "Category", "Note"]);
    expect(map).toEqual({ date: 2, type: 1, category: 3, note: 4, amount: 0 });
    expect(missing).toEqual([]);
  });

  it("treats Note as optional (index -1 when absent)", () => {
    const { map, missing } = mapCsvColumns(["Date", "Type", "Category", "Amount"]);
    expect(map.note).toBe(-1);
    expect(missing).toEqual([]);
  });

  it("reports each missing required column by display label", () => {
    const { missing } = mapCsvColumns(["Date", "Category"]);
    expect(missing).toEqual(["Type", "Amount"]);
  });
});
