import { describe, it, expect } from "vitest";
import { serializeTransaction, serializeBudget } from "@/lib/serialize";

describe("serializeTransaction", () => {
  it("converts a Decimal string amount to a plain number", () => {
    const result = serializeTransaction({ id: "tx-1", amount: "1234.56" });
    expect(result.amount).toBe(1234.56);
    expect(typeof result.amount).toBe("number");
  });

  it("converts an integer-like Decimal to a number", () => {
    const result = serializeTransaction({ id: "tx-1", amount: "5000.00" });
    expect(result.amount).toBe(5000);
  });

  it("preserves all other fields unchanged", () => {
    const date = new Date("2026-05-15");
    const input = {
      id: "tx-1",
      amount: "100.00",
      date,
      note: "lunch",
      type: "expense",
      userId: "user-1",
    };
    const result = serializeTransaction(input);
    expect(result.id).toBe("tx-1");
    expect(result.date).toBe(date);
    expect(result.note).toBe("lunch");
    expect(result.type).toBe("expense");
    expect(result.userId).toBe("user-1");
  });

  it("does not mutate the original object", () => {
    const input = { id: "tx-1", amount: "500.00" };
    serializeTransaction(input);
    expect(input.amount).toBe("500.00"); // still a string
  });
});

describe("serializeBudget", () => {
  it("converts a Decimal string limit to a plain number", () => {
    const result = serializeBudget({ id: "b-1", limit: "3000.00" });
    expect(result.limit).toBe(3000);
    expect(typeof result.limit).toBe("number");
  });

  it("converts a fractional Decimal limit correctly", () => {
    const result = serializeBudget({ id: "b-1", limit: "1500.50" });
    expect(result.limit).toBe(1500.5);
  });

  it("preserves all other fields unchanged", () => {
    const month = new Date("2026-05-01");
    const input = { id: "b-1", limit: "500.00", month, userId: "user-1" };
    const result = serializeBudget(input);
    expect(result.id).toBe("b-1");
    expect(result.month).toBe(month);
    expect(result.userId).toBe("user-1");
  });

  it("does not mutate the original object", () => {
    const input = { id: "b-1", limit: "800.00" };
    serializeBudget(input);
    expect(input.limit).toBe("800.00");
  });
});
