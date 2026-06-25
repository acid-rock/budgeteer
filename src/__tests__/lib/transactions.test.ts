import { describe, it, expect } from "vitest";
import {
  prependTransaction,
  type TransactionsInfiniteData,
} from "@/lib/transactions";
import type { Transaction } from "@/types";

function tx(id: string): Transaction {
  return {
    id,
    type: "expense",
    amount: 10,
    date: "2026-06-25T00:00:00.000Z",
    note: null,
    categoryId: "cat-1",
  };
}

describe("prependTransaction", () => {
  it("inserts the transaction at the head of the first page", () => {
    const data: TransactionsInfiniteData = {
      pages: [
        { items: [tx("a"), tx("b")], nextCursor: "b" },
        { items: [tx("c")], nextCursor: null },
      ],
      pageParams: [null, "b"],
    };

    const next = prependTransaction(data, tx("new"));

    expect(next?.pages[0].items.map((t) => t.id)).toEqual(["new", "a", "b"]);
    // Later pages are left untouched.
    expect(next?.pages[1].items.map((t) => t.id)).toEqual(["c"]);
  });

  it("does not mutate the original cache object", () => {
    const data: TransactionsInfiniteData = {
      pages: [{ items: [tx("a")], nextCursor: null }],
      pageParams: [null],
    };

    prependTransaction(data, tx("new"));

    expect(data.pages[0].items.map((t) => t.id)).toEqual(["a"]);
  });

  it("returns the input unchanged when the list isn't loaded yet", () => {
    expect(prependTransaction(undefined, tx("new"))).toBeUndefined();

    const empty: TransactionsInfiniteData = { pages: [], pageParams: [] };
    expect(prependTransaction(empty, tx("new"))).toBe(empty);
  });
});
