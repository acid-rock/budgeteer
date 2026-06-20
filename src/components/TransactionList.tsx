"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TransactionRow } from "./TransactionRow";
import { TransactionsSkeleton } from "./Skeletons";

interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
}

async function fetchTransactions(
  cursor: string | null
): Promise<TransactionPage> {
  const res = await fetch(
    cursor ? `/api/transactions?cursor=${cursor}` : "/api/transactions"
  );
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

export function TransactionList() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => fetchTransactions(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (isLoading) {
    return <TransactionsSkeleton />;
  }
  if (isError) {
    return <p className="mint-err">{(error as Error).message}</p>;
  }

  const transactions = data?.pages.flatMap((p) => p.items) ?? [];
  if (transactions.length === 0) {
    return <p className="mint-muted">No transactions yet — add one above.</p>;
  }

  // Group consecutive transactions by their displayed day (already date-sorted
  // newest-first from the API). Grouping on the formatted label keeps the header
  // in lockstep with each row's shown date regardless of timezone.
  const groups: { label: string; items: Transaction[] }[] = [];
  for (const t of transactions) {
    const label = formatDate(t.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(t);
    else groups.push({ label, items: [t] });
  }

  return (
    <div className="mint-panel">
      {groups.map((g) => {
        const net = g.items.reduce(
          (s, t) =>
            s + (t.type === "income" ? Number(t.amount) : -Number(t.amount)),
          0
        );
        return (
          <div key={g.label} className="mint-daygroup">
            <div className="mint-daylabel">
              <span>{g.label}</span>
              <span className="sum">
                {net >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(net))}
              </span>
            </div>
            {g.items.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        );
      })}
      {hasNextPage && (
        <div style={{ textAlign: "center", paddingTop: 16 }}>
          <button
            className="mint-btn"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
