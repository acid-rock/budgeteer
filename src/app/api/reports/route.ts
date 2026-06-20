import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dateToMonthString, monthRange } from "@/lib/utils";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";
import type { CategoryReportRow, MonthlyReport } from "@/types";

export const GET = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? dateToMonthString();
  const { start, end } = monthRange(month);

  const dateRange = { date: { gte: start, lt: end }, userId };

  const [totalsByType, spendByCategory, budgets, categories] =
    await Promise.all([
      prisma.transaction.groupBy({
        by: ["type"],
        where: dateRange,
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: { ...dateRange, type: "expense" },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({ where: { month: start, userId } }),
      prisma.category.findMany({ where: { userId } }),
    ]);

  const sumForType = (type: string) =>
    Number(totalsByType.find((g) => g.type === type)?._sum.amount ?? 0);
  const totalIncome = sumForType("income");
  const totalExpenses = sumForType("expense");

  const spentByCategory = new Map(
    spendByCategory.map((g) => [g.categoryId, Number(g._sum.amount ?? 0)])
  );
  const limitByCategory = new Map(
    budgets.map((b) => [b.categoryId, Number(b.limit)])
  );

  const byCategory: CategoryReportRow[] = categories
    .filter(
      (c) =>
        c.kind === "expense" &&
        (spentByCategory.has(c.id) || limitByCategory.has(c.id))
    )
    .map((c) => ({
      categoryId: c.id,
      categoryName: c.name,
      spent: spentByCategory.get(c.id) ?? 0,
      limit: limitByCategory.get(c.id) ?? null,
    }))
    .sort((a, b) => b.spent - a.spent);

  const report: MonthlyReport = {
    month,
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    byCategory,
  };
  return NextResponse.json(report);
});
