import { cache } from "react";
import { prisma } from "@/lib/db";

// Wrapped in React's cache() so calling the same function with the same
// args from multiple Suspense-boundary components in one render only hits
// the DB once per request (e.g. spending-by-category is needed by both the
// donut and the top-spending panel).

export const getMonthTotals = cache(async (userId: string, start: Date, end: Date) => {
  const totalsByType = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const sumForType = (type: string) =>
    Number(totalsByType.find((g) => g.type === type)?._sum.amount ?? 0);
  const totalIncome = sumForType("income");
  const totalExpenses = sumForType("expense");
  return { totalIncome, totalExpenses, netSavings: totalIncome - totalExpenses };
});

export const getCategorySpending = cache(async (userId: string, start: Date, end: Date) => {
  const expenseByCategory = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, type: "expense", date: { gte: start, lt: end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const catIds = expenseByCategory.map((g) => g.categoryId);
  const cats = await prisma.category.findMany({
    where: { userId, id: { in: catIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cats.map((c) => [c.id, c.name]));
  return expenseByCategory.map((g) => ({
    name: nameById.get(g.categoryId) ?? "—",
    amount: Number(g._sum.amount ?? 0),
  }));
});

export const getRecentTransactions = cache(async (userId: string) => {
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 5,
    include: { category: true },
  });
});

// Per-day transaction counts for the activity heatmap, aggregated in
// Postgres instead of pulling one row per transaction and counting in JS.
export const getActivityCounts = cache(async (userId: string, activityStart: Date) => {
  const rows = await prisma.transaction.groupBy({
    by: ["date"],
    where: { userId, date: { gte: activityStart } },
    _count: { _all: true },
  });
  const countByDate: Record<string, number> = {};
  for (const r of rows) {
    countByDate[r.date.toISOString().slice(0, 10)] = r._count._all;
  }
  return countByDate;
});

// Distinct calendar months (UTC, "YYYY-MM") that have at least one transaction
// for this user, newest first. Powers the dashboard month switcher so it only
// offers months that actually have data. `distinct: ["date"]` keeps this bounded
// to one row per active day rather than one per transaction. Dates are stored at
// UTC midnight, so the UTC month slice matches `monthRange`'s UTC boundaries.
export const getTransactionMonths = cache(async (userId: string) => {
  const rows = await prisma.transaction.findMany({
    where: { userId },
    select: { date: true },
    distinct: ["date"],
  });
  const months = new Set<string>();
  for (const r of rows) {
    months.add(r.date.toISOString().slice(0, 7));
  }
  return [...months].sort().reverse();
});

export const getDailySpending = cache(async (userId: string, dailyStart: Date) => {
  const rows = await prisma.transaction.groupBy({
    by: ["date"],
    where: { userId, type: "expense", date: { gte: dailyStart } },
    _sum: { amount: true },
  });
  const dailyMap: Record<string, number> = {};
  for (const r of rows) {
    dailyMap[r.date.toISOString().slice(0, 10)] = Number(r._sum.amount ?? 0);
  }
  return dailyMap;
});
