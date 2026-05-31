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

  // Pull everything for the month in parallel.
  const [transactions, budgets, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: start, lt: end } },
    }),
    prisma.budget.findMany({ where: { month: start } }),
    prisma.category.findMany(),
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;
  const spentByCategory = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === "income") {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      spentByCategory.set(
        t.categoryId,
        (spentByCategory.get(t.categoryId) ?? 0) + t.amount
      );
    }
  }

  const limitByCategory = new Map(budgets.map((b) => [b.categoryId, b.limit]));

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
