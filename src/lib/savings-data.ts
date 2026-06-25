import { cache } from "react";
import { prisma } from "@/lib/db";
import type { SavingsSummary } from "@/types";

// Per-bucket savings balances. Mirrors dashboard-data.ts: wrapped in React's
// cache() so a request that needs the summary from more than one place hits the
// DB once. A bucket's balance is the sum of its deposits minus its withdrawals;
// these "deposit"/"withdraw" rows live on the same Transaction table but never
// enter the income/expense ledger (every ledger query filters by those types).
export const getSavingsSummary = cache(
  async (userId: string): Promise<SavingsSummary> => {
    const [buckets, movements] = await Promise.all([
      prisma.category.findMany({
        where: { userId, kind: "savings" },
        select: { id: true, name: true, target: true },
        orderBy: { name: "asc" },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId", "type"],
        where: { userId, type: { in: ["deposit", "withdraw"] } },
        _sum: { amount: true },
      }),
    ]);

    const deposited = new Map<string, number>();
    const withdrawn = new Map<string, number>();
    for (const m of movements) {
      const amount = Number(m._sum.amount ?? 0);
      (m.type === "deposit" ? deposited : withdrawn).set(m.categoryId, amount);
    }

    let totalSaved = 0;
    const summary = buckets.map((b) => {
      const dep = deposited.get(b.id) ?? 0;
      const wd = withdrawn.get(b.id) ?? 0;
      const balance = dep - wd;
      totalSaved += balance;
      return {
        categoryId: b.id,
        name: b.name,
        balance,
        deposited: dep,
        withdrawn: wd,
        target: b.target == null ? null : Number(b.target),
      };
    });

    return { totalSaved, buckets: summary };
  }
);
