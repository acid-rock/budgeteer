import Link from "next/link";
import { Suspense } from "react";
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
import { DailyBarChart } from "@/components/DailyBarChart";
import {
  getMonthTotals,
  getCategorySpending,
  getRecentTransactions,
  getActivityCounts,
  getDailySpending,
} from "@/lib/dashboard-data";

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

      <Suspense fallback={<StatsFallback />}>
        <StatsSection userId={userId} start={start} end={end} />
      </Suspense>

      <div className="mint-grid">
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Spending by category</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {monthName}
            </span>
          </div>
          <Suspense fallback={<DonutFallback />}>
            <SpendingDonutSection userId={userId} start={start} end={end} />
          </Suspense>
        </div>
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Daily spending</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Last 14 days
            </span>
          </div>
          <Suspense fallback={<DailyFallback />}>
            <DailySpendingSection
              userId={userId}
              dailyStart={dailyStart}
              todayUTC={todayUTC}
            />
          </Suspense>
        </div>
      </div>

      <div className="mint-panel" style={{ marginBottom: 16 }}>
        <div className="mint-ph">
          <h3>Activity</h3>
          <Link className="vall" href="/reports">
            Last year
          </Link>
        </div>
        <Suspense fallback={<div className="mint-skel" style={{ height: 130 }} />}>
          <ActivitySection userId={userId} activityStart={activityStart} />
        </Suspense>
      </div>

      <div className="mint-grid">
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Recent activity</h3>
            <Link className="vall" href="/transactions">
              View all
            </Link>
          </div>
          <Suspense fallback={<ListFallback />}>
            <RecentActivitySection userId={userId} />
          </Suspense>
        </div>
        <div className="mint-panel">
          <div className="mint-ph">
            <h3>Top spending</h3>
            <Link className="vall" href="/budgets">
              Budgets
            </Link>
          </div>
          <Suspense fallback={<ListFallback />}>
            <TopSpendingSection userId={userId} start={start} end={end} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

function StatsFallback() {
  return (
    <div className="mint-stats">
      <div className="mint-stat">
        <div className="lbl">
          <span className="mint-dot" style={{ background: "var(--pos)" }} />
          Income
        </div>
        <div className="mint-skel" style={{ height: 30, width: "60%" }} />
      </div>
      <div className="mint-stat">
        <div className="lbl">
          <span className="mint-dot" style={{ background: "var(--neg)" }} />
          Expenses
        </div>
        <div className="mint-skel" style={{ height: 30, width: "60%" }} />
      </div>
      <div className="mint-stat feat">
        <div className="lbl">Net savings</div>
        <div
          className="mint-skel"
          style={{ height: 30, width: "60%", background: "rgba(255,255,255,0.25)" }}
        />
      </div>
    </div>
  );
}

function DonutFallback() {
  return (
    <div className="mint-donut-wrap">
      <div className="mint-skel" style={{ width: 180, height: 180, borderRadius: "50%" }} />
      <div className="mint-legend">
        {[85, 70, 90, 60].map((w, i) => (
          <div key={i} className="mint-skel" style={{ height: 14, width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function DailyFallback() {
  const heights = [40, 70, 30, 90, 55, 65, 35, 80, 45, 95, 60, 50, 75, 40];
  return (
    <div className="mint-bars">
      {heights.map((h, i) => (
        <div key={i} className="mint-bar">
          <div className="mint-skel" style={{ height: h }} />
        </div>
      ))}
    </div>
  );
}

function ListFallback() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="mint-skel" style={{ height: 38 }} />
      ))}
    </div>
  );
}

async function StatsSection({
  userId,
  start,
  end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  const { totalIncome, totalExpenses, netSavings } = await getMonthTotals(
    userId,
    start,
    end
  );
  return (
    <div className="mint-stats mint-fadein">
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
  );
}

async function SpendingDonutSection({
  userId,
  start,
  end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  const spending = await getCategorySpending(userId, start, end);
  const totalSpend = spending.reduce((s, c) => s + c.amount, 0);
  const legend = spending.slice(0, 6);

  if (totalSpend === 0) {
    return <p className="mint-muted mint-fadein">No expenses this month yet.</p>;
  }
  return (
    <div className="mint-donut-wrap mint-fadein">
      <Donut segments={legend} total={totalSpend} />
      <div className="mint-legend">
        {legend.map((c, i) => (
          <div key={c.name} className="mint-leg">
            <span className="mint-dot" style={{ background: CHART_PALETTE[i] }} />
            <span className="nm">{c.name}</span>
            <span className="am num">{formatCurrency(c.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function TopSpendingSection({
  userId,
  start,
  end,
}: {
  userId: string;
  start: Date;
  end: Date;
}) {
  const spending = await getCategorySpending(userId, start, end);
  const topSpending = spending.slice(0, 5);
  const maxSpend = topSpending[0]?.amount ?? 0;

  if (topSpending.length === 0) {
    return <p className="mint-muted mint-fadein">No expenses this month.</p>;
  }
  return (
    <div className="mint-tlist mint-fadein">
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
  );
}

async function DailySpendingSection({
  userId,
  dailyStart,
  todayUTC,
}: {
  userId: string;
  dailyStart: Date;
  todayUTC: Date;
}) {
  const dailyMap = await getDailySpending(userId, dailyStart);
  const fmtShort = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      month: "short",
      day: "numeric",
    }).format(d);
  const daily: { label: string; amount: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(dailyStart.getTime() + i * DAY_MS);
    const iso = d.toISOString().slice(0, 10);
    daily.push({ label: fmtShort(d), amount: dailyMap[iso] ?? 0 });
  }

  return (
    <div className="mint-fadein">
      <DailyBarChart data={daily} />
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
  );
}

async function ActivitySection({
  userId,
  activityStart,
}: {
  userId: string;
  activityStart: Date;
}) {
  const countByDate = await getActivityCounts(userId, activityStart);
  return (
    <div className="mint-fadein">
      <ActivityGrid countByDate={countByDate} />
    </div>
  );
}

async function RecentActivitySection({ userId }: { userId: string }) {
  const recentTransactions = await getRecentTransactions(userId);
  if (recentTransactions.length === 0) {
    return <p className="mint-muted mint-fadein">No transactions yet.</p>;
  }
  return (
    <div className="mint-act mint-fadein">
      {recentTransactions.map((t) => (
        <div key={t.id} className="mint-row">
          <div className="mint-ic">
            <div
              className="g"
              style={{ background: colorForCategory(t.category?.name ?? "—") }}
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
  );
}
