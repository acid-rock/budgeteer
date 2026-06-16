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
  APP_TIME_ZONE,
} from "@/lib/utils";
import { CHART_PALETTE, colorForCategory } from "@/lib/colors";
import { ActivityGrid } from "@/components/ActivityGrid";
import { Donut } from "@/components/Donut";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const month = dateToMonthString();
  const { start, end } = monthRange(month);

  // Anchor "today" to the app timezone for the rolling-window queries.
  const todayStr = todayDateString();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(ty, tm - 1, td));
  const activityStart = new Date(todayUTC.getTime() - 371 * DAY_MS);
  const dailyStart = new Date(todayUTC.getTime() - 13 * DAY_MS);

  const [
    totalsByType,
    expenseByCategory,
    recentTransactions,
    activityRows,
    dailyRows,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", date: { gte: start, lt: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 5,
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: activityStart } },
      select: { date: true },
    }),
    prisma.transaction.findMany({
      where: { userId, type: "expense", date: { gte: dailyStart } },
      select: { date: true, amount: true },
    }),
  ]);

  const sumForType = (type: string) =>
    Number(totalsByType.find((g) => g.type === type)?._sum.amount ?? 0);
  const totalIncome = sumForType("income");
  const totalExpenses = sumForType("expense");
  const netSavings = totalIncome - totalExpenses;

  // Resolve category names for the expense breakdown.
  const catIds = expenseByCategory.map((g) => g.categoryId);
  const cats = await prisma.category.findMany({
    where: { userId, id: { in: catIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cats.map((c) => [c.id, c.name]));
  const spending = expenseByCategory.map((g) => ({
    name: nameById.get(g.categoryId) ?? "—",
    amount: Number(g._sum.amount ?? 0),
  }));
  const totalSpend = spending.reduce((s, c) => s + c.amount, 0);
  const legend = spending.slice(0, 6);
  const topSpending = spending.slice(0, 5);
  const maxSpend = topSpending[0]?.amount ?? 0;

  // Activity heatmap counts (transactions per day).
  const countByDate: Record<string, number> = {};
  for (const r of activityRows) {
    const k = r.date.toISOString().slice(0, 10);
    countByDate[k] = (countByDate[k] ?? 0) + 1;
  }

  // 14-day daily spending series.
  const dailyMap: Record<string, number> = {};
  for (const r of dailyRows) {
    const k = r.date.toISOString().slice(0, 10);
    dailyMap[k] = (dailyMap[k] ?? 0) + Number(r.amount);
  }
  const daily: number[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(dailyStart.getTime() + i * DAY_MS)
      .toISOString()
      .slice(0, 10);
    daily.push(dailyMap[d] ?? 0);
  }
  const fmtShort = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      month: "short",
      day: "numeric",
    }).format(d);

  const firstName = (session.user.name ?? "there").split(/\s+/)[0];
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const monthName = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "long",
  }).format(new Date());

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>
            {greeting}, {firstName}
          </h1>
          <p>Here&rsquo;s how {monthName} is shaping up.</p>
        </div>
        <div className="mint-cta">
          <Link className="mint-btn" href="/reports">
            View report
          </Link>
          <Link className="mint-btn pri" href="/transactions">
            + Add transaction
          </Link>
        </div>
      </div>

      <div className="mint-stats">
        <div className="mint-stat">
          <div className="lbl">
            <span className="mint-dot" style={{ background: "var(--pos)" }} />
            Income
          </div>
          <div className="val num">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="mint-stat">
          <div className="lbl">
            <span className="mint-dot" style={{ background: "var(--neg)" }} />
            Expenses
          </div>
          <div className="val num">{formatCurrency(totalExpenses)}</div>
          {totalIncome > 0 && (
            <div className="sub">
              {Math.round((totalExpenses / totalIncome) * 100)}% of income spent
            </div>
          )}
        </div>
        <div className="mint-stat feat">
          <div className="lbl">Net savings</div>
          <div className="val num">{formatCurrency(netSavings)}</div>
          <div className="sub">
            {netSavings >= 0
              ? "You stayed in the green this month."
              : "You spent more than you earned."}
          </div>
        </div>
      </div>

      <div className="mint-grid">
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Spending by category</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {monthName}
            </span>
          </div>
          {totalSpend === 0 ? (
            <p className="mint-muted">No expenses this month yet.</p>
          ) : (
            <div className="mint-donut-wrap">
              <Donut segments={legend} total={totalSpend} />
              <div className="mint-legend">
                {legend.map((c, i) => (
                  <div key={c.name} className="mint-leg">
                    <span
                      className="mint-dot"
                      style={{ background: CHART_PALETTE[i] }}
                    />
                    <span className="nm">{c.name}</span>
                    <span className="am num">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Daily spending</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Last 14 days
            </span>
          </div>
          <CashflowBars values={daily} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 8,
            }}
          >
            <span>{fmtShort(dailyStart)}</span>
            <span>{fmtShort(todayUTC)}</span>
          </div>
        </div>
      </div>

      <div className="mint-panel" style={{ marginBottom: 16 }}>
        <div className="mint-ph">
          <h3>Activity</h3>
          <Link className="vall" href="/reports">
            Last year
          </Link>
        </div>
        <ActivityGrid countByDate={countByDate} />
      </div>

      <div className="mint-grid">
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Recent activity</h3>
            <Link className="vall" href="/transactions">
              View all
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="mint-muted">No transactions yet.</p>
          ) : (
            <div className="mint-act">
              {recentTransactions.map((t) => (
                <div key={t.id} className="mint-row">
                  <div className="mint-ic">
                    <div
                      className="g"
                      style={{
                        background: colorForCategory(t.category?.name ?? "—"),
                      }}
                    />
                  </div>
                  <div>
                    <div className="nm">{t.category?.name ?? "—"}</div>
                    <div className="mt">
                      {formatDate(t.date)}
                      {t.note ? ` · ${t.note}` : ""}
                    </div>
                  </div>
                  <div className={"am" + (t.type === "income" ? " pos" : "")}>
                    {t.type === "income" ? "+" : "−"}
                    {formatCurrency(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Top spending</h3>
            <Link className="vall" href="/budgets">
              Budgets
            </Link>
          </div>
          {topSpending.length === 0 ? (
            <p className="mint-muted">No expenses this month.</p>
          ) : (
            <div className="mint-tlist">
              {topSpending.map((c, i) => (
                <div key={c.name} className="mint-trow">
                  <div className="top">
                    <span className="nm">{c.name}</span>
                    <span className="am num">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="mint-track">
                    <div
                      className="fill"
                      style={{
                        width: `${maxSpend > 0 ? (c.amount / maxSpend) * 100 : 0}%`,
                        background: CHART_PALETTE[i],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// 14-day expense bars; days over ₱300 get the darker gradient.
function CashflowBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="mint-bars">
      {values.map((v, i) => (
        <div key={i} className={"mint-bar" + (v > 300 ? " hi" : "")}>
          <div
            className="b"
            style={{ height: `${Math.max(6, (v / max) * 120)}px` }}
          />
        </div>
      ))}
    </div>
  );
}
