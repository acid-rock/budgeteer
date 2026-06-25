// Shared client-side helpers for creating transactions, used by both the inline
// TransactionForm and the global Quick-Add. Keeps the create/optimistic logic in
// one place so neither call site re-implements it.

import type { InfiniteData } from "@tanstack/react-query";
import type { Transaction, TransactionType } from "@/types";

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  note: string;
}

export async function createTransaction(
  input: NewTransaction
): Promise<Transaction> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create transaction");
  }
  return res.json();
}

// One page of the cursor-paginated ledger, as the ["transactions"] infinite
// query caches it. Mirrors the shape returned by GET /api/transactions.
export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
}

export type TransactionsInfiniteData = InfiniteData<
  TransactionPage,
  string | null
>;

// Insert a transaction at the head of the first cached page so an optimistic
// quick-add appears immediately; the follow-up invalidation reconciles real id
// and ordering. No-op until the list has been loaded (nothing on screen yet).
export function prependTransaction(
  data: TransactionsInfiniteData | undefined,
  tx: Transaction
): TransactionsInfiniteData | undefined {
  if (!data || data.pages.length === 0) return data;
  const [first, ...rest] = data.pages;
  return {
    ...data,
    pages: [{ ...first, items: [tx, ...first.items] }, ...rest],
  };
}
