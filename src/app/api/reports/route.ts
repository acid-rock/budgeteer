import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dateToMonthString, monthRange } from "@/lib/utils";
import type { CategoryReportRow, MonthlyReport } from "@/types";

// GET /api/reports?month=YYYY-MM — monthly aggregation.
// Returns total income, total expenses, net savings, and a per-category
// breakdown with the budget limit (if any) alongside actual spend.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? dateToMonthString();
  const { start, end } = monthRange(month);

  const dateRange = { date: { gte: start, lt: end } };

  // Aggregate in the database so the sums stay exact (Decimal), then convert
  // the final totals to plain numbers for the response.
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
      prisma.budget.findMany({ where: { month: start } }),
      prisma.category.findMany(),
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

  // Build a row for every expense category that has either spend or a budget.
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
}
