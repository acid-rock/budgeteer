import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, dateToMonthString, monthRange } from "@/lib/utils";

// Dashboard: a quick read-only snapshot of the current month, rendered on the
// server straight from the DB. Expand with charts/widgets later.
export default async function DashboardPage() {
  const month = dateToMonthString();
  const { start, end } = monthRange(month);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: start, lt: end } },
  });

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
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
    </div>
  );
}
