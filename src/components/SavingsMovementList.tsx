"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { SavingsMovement } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { colorForCategory, categoryTile } from "@/lib/colors";
import { CategoryIcon } from "@/lib/category-icon";

interface MovementPage {
  items: SavingsMovement[];
  nextCursor: string | null;
}

async function fetchMovements(cursor: string | null): Promise<MovementPage> {
  const res = await fetch(
    cursor
      ? `/api/savings/movements?cursor=${cursor}`
      : "/api/savings/movements"
  );
  if (!res.ok) throw new Error("Failed to load movements");
  return res.json();
}

function MovementRow({ movement }: { movement: SavingsMovement }) {
  const bucketName = movement.category?.name ?? "—";
  const color = colorForCategory(bucketName);
  const isDeposit = movement.type === "deposit";
  return (
    <div className="mint-row">
      <div className="mint-ic" style={categoryTile(color, "savings")}>
        <CategoryIcon name={bucketName} kind="savings" size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="nm" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {movement.note?.trim() || bucketName}
        </div>
        <div className="mt">
          <span className="mint-tag">
            <span className="d" style={{ background: color }} />
            {bucketName} · {isDeposit ? "Deposit" : "Withdraw"}
          </span>
        </div>
      </div>
      <div className={"am" + (isDeposit ? " pos" : "")}>
        {isDeposit ? "+" : "−"}
        {formatCurrency(movement.amount)}
      </div>
    </div>
  );
}

export function SavingsMovementList() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["savings-movements"],
    queryFn: ({ pageParam }) => fetchMovements(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (isLoading) {
    return <p className="mint-muted">Loading movements…</p>;
  }
  if (isError) {
    return <p className="mint-err">{(error as Error).message}</p>;
  }

  const movements = data?.pages.flatMap((p) => p.items) ?? [];
  if (movements.length === 0) {
    return (
      <p className="mint-muted">No deposits or withdrawals yet — add one above.</p>
    );
  }

  // Group consecutive movements by their displayed day (already date-sorted
  // newest-first from the API), matching the Transactions list.
  const groups: { label: string; items: SavingsMovement[] }[] = [];
  for (const m of movements) {
    const label = formatDate(m.date);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }

  return (
    <div className="mint-panel">
      {groups.map((g) => {
        const net = g.items.reduce(
          (s, m) =>
            s + (m.type === "deposit" ? Number(m.amount) : -Number(m.amount)),
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
            {g.items.map((m) => (
              <MovementRow key={m.id} movement={m} />
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
