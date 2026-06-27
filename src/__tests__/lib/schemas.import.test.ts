import { describe, it, expect } from "vitest";
import { transactionImportRowSchema } from "@/lib/schemas";

describe("transactionImportRowSchema", () => {
  const valid = {
    date: "2026-01-15",
    type: "expense",
    category: "Groceries",
    note: "weekly run",
    amount: "42.50",
  };

  it("parses a well-formed row, coercing date and amount", () => {
    const parsed = transactionImportRowSchema.parse(valid);
    expect(parsed.amount).toBe(42.5);
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.date.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(parsed.type).toBe("expense");
  });

  it("accepts a null note (no Note column)", () => {
    expect(transactionImportRowSchema.parse({ ...valid, note: null }).note).toBeNull();
  });

  it.each([
    ["bad date", { ...valid, date: "not-a-date" }, /date/i],
    ["bad type", { ...valid, type: "transfer" }, /income.*expense/i],
    ["empty category", { ...valid, category: "" }, /name is required/i],
    ["negative amount", { ...valid, amount: "-1" }, /positive/i],
    ["zero amount", { ...valid, amount: "0" }, /positive/i],
    ["non-numeric amount", { ...valid, amount: "abc" }, /number|positive/i],
  ])("rejects %s", (_label, input, message) => {
    const result = transactionImportRowSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toMatch(message);
  });
});
