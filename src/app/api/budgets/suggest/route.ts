import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  dateToMonthString,
  monthStringToDate,
  priorMonthsRange,
} from "@/lib/utils";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";
import type { BudgetSuggestion } from "@/types";

// Number of trailing months averaged for the suggestion. Today the only strategy
// is this rolling average; a future ?strategy= param (last-month, all-time, …)
// would branch here and pick the window / math accordingly.
const WINDOW_MONTHS = 3;

// GET /api/budgets/suggest?month=YYYY-MM
// Suggests each expense category's budget from its average spend over the prior
// `WINDOW_MONTHS` months. Returns a row per expense category (suggested 0 when no
// history) plus the limit it already has for the target month, for the preview.
export const GET = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? dateToMonthString();
  const { start, end } = priorMonthsRange(month, WINDOW_MONTHS);

  const [spendByCategory, categories, budgets] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId, kind: "expense" },
      orderBy: { name: "asc" },
    }),
    prisma.budget.findMany({
      where: { userId, month: monthStringToDate(month) },
    }),
  ]);

  const spentByCategory = new Map(
    spendByCategory.map((g) => [g.categoryId, Number(g._sum.amount ?? 0)])
  );
  const limitByCategory = new Map(
    budgets.map((b) => [b.categoryId, Number(b.limit)])
  );

  const suggestions: BudgetSuggestion[] = categories.map((c) => {
    const total = spentByCategory.get(c.id) ?? 0;
    // Raw average over the window, to 2 decimals — no buffer, no rounding up.
    const suggested = Math.round((total / WINDOW_MONTHS) * 100) / 100;
    return {
      categoryId: c.id,
      categoryName: c.name,
      suggested,
      existingLimit: limitByCategory.get(c.id) ?? null,
    };
  });

  return NextResponse.json({ month, suggestions });
});
