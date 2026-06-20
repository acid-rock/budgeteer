import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";

export interface CategoryStat {
  categoryId: string;
  count: number;
  total: number;
}

// Per-category transaction count + summed amount (all-time) for the signed-in
// user. Powers the Categories card grid. A category is always one kind, so the
// summed amount is naturally that category's income or expense total.
export const GET = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grouped = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const stats: CategoryStat[] = grouped.map((g) => ({
    categoryId: g.categoryId,
    count: g._count._all,
    total: Number(g._sum.amount ?? 0),
  }));
  return NextResponse.json(stats);
});
