import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  formatCurrency,
  formatDate,
  dateToMonthString,
  monthRange,
  todayDateString,
} from "@/lib/utils";
import { ActivityGrid } from "@/components/ActivityGrid";

// Render per-request: the dashboard reads live "this month" totals from the DB,
// so it must not be statically prerendered/cached at build time.
export const dynamic = "force-dynamic";

// Dashboard: a quick read-only snapshot of the current month, rendered on the
// server straight from the DB. Expand with charts/widgets later.
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const month = dateToMonthString();
  const { start, end } = monthRange(month);

  // Sum in the database (exact Decimal), then convert to numbers for display.
  const totalsByType = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const sumForType = (type: string) =>
    Number(totalsByType.find((g) => g.type === type)?._sum.amount ?? 0);
  const totalIncome = sumForType("income");
  const totalExpenses = sumForType("expense");
  const netSavings = totalIncome - totalExpenses;

  const cards = [
    { label: "Income", value: totalIncome, tone: "text-green-600" },
    { label: "Expenses", value: totalExpenses, tone: "text-slate-900" },
    {
      label: "Net Savings",
      value: netSavings,
      tone: netSavings >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  // Cutoff for the 12-week activity grid: Sunday of the week 11 weeks ago.
  const todayStr = todayDateString();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(ty, tm - 1, td));
  const twelveWeeksAgo = new Date(
    todayUTC.getTime() - (todayUTC.getUTCDay() + 357) * 86_400_000
  );

  // Two essential at-a-glance lists: latest activity and where money is going.
  const [recentTransactions, expenseByCategory, activityRows] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: { category: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: twelveWeeksAgo } },
      select: { date: true },
    }),
  ]);

  const activeDateSet = new Set(
    activityRows.map((t) => t.date.toISOString().slice(0, 10))
  );

  // Resolve category names for the top-spending rows.
  const topCategories = await prisma.category.findMany({
    where: { userId, id: { in: expenseByCategory.map((g) => g.categoryId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topCategories.map((c) => [c.id, c.name]));
  const topSpending = expenseByCategory.map((g) => ({
    name: nameById.get(g.categoryId) ?? "—",
    amount: Number(g._sum.amount ?? 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">This month ({month})</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.tone}`}>
              {formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          href="/transactions"
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Add a transaction
        </Link>
        <Link
          href="/reports"
          className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
        >
          View report
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Activity</h3>
          <span className="text-sm text-slate-500">Last year</span>
        </div>
        <ActivityGrid activeDates={activeDateSet} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent activity */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent activity</h3>
            <Link
              href="/transactions"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              View all
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentTransactions.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t.category?.name ?? "—"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(t.date)}
                      {t.note ? ` · ${t.note}` : ""}
                    </span>
                  </div>
                  <span
                    className={`font-medium ${
                      t.type === "income" ? "text-green-600" : "text-slate-900"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatCurrency(Number(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top spending this month */}
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Top spending</h3>
            <span className="text-sm text-slate-500">{month}</span>
          </div>
          {topSpending.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses this month.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {topSpending.map((row) => {
                const pct =
                  totalExpenses > 0
                    ? Math.round((row.amount / totalExpenses) * 100)
                    : 0;
                return (
                  <li key={row.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{row.name}</span>
                      <span className="font-medium">
                        {formatCurrency(row.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-1.5 rounded-full bg-slate-900"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
