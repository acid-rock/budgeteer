"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dateToMonthString, formatCurrency } from "@/lib/utils";
import { CHART_PALETTE, categoryTile } from "@/lib/colors";
import { CategoryIcon } from "@/lib/category-icon";
import { Donut } from "@/components/Donut";
import { ReportSkeleton } from "@/components/Skeletons";
import type { MonthlyReport } from "@/types";

async function fetchReport(month: string): Promise<MonthlyReport> {
  const res = await fetch(`/api/reports?month=${month}`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

export default function ReportsPage() {
  const [month, setMonth] = useState(dateToMonthString());
  const { data, isLoading } = useQuery({
    queryKey: ["report", month],
    queryFn: () => fetchReport(month),
  });

  const spending =
    data?.byCategory
      .filter((r) => r.spent > 0)
      .slice()
      .sort((a, b) => b.spent - a.spent) ?? [];
  const totalSpend = spending.reduce((s, c) => s + c.spent, 0);

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Monthly report</h1>
          <p>Income, expenses, and category breakdown.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* A real download link to an API route (served with Content-Disposition),
              not a page navigation — next/link is for client-side page transitions. */}
          <a className="mint-btn" href="/api/transactions/export" download>
            Export CSV
          </a>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mint-input"
          />
        </div>
      </div>

      {isLoading || !data ? (
        <ReportSkeleton />
      ) : (
        <>
          <div className="mint-stats">
            <div className="mint-stat">
              <div className="lbl">
                <span className="mint-dot" style={{ background: "var(--pos)" }} />
                Total income
              </div>
              <div className="val num">{formatCurrency(data.totalIncome)}</div>
            </div>
            <div className="mint-stat">
              <div className="lbl">
                <span className="mint-dot" style={{ background: "var(--neg)" }} />
                Total expenses
              </div>
              <div className="val num">{formatCurrency(data.totalExpenses)}</div>
            </div>
            <div className="mint-stat feat">
              <div className="lbl">Net savings</div>
              <div className="val num">{formatCurrency(data.netSavings)}</div>
            </div>
          </div>

          <div className="mint-grid split">
            <div className="mint-panel">
              <div className="mint-ph">
                <h3>Breakdown</h3>
              </div>
              {totalSpend === 0 ? (
                <p className="mint-muted">No expenses recorded this month.</p>
              ) : (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut
                    segments={spending.map((c) => ({
                      name: c.categoryName,
                      amount: c.spent,
                    }))}
                    total={totalSpend}
                    size={180}
                  />
                </div>
              )}
            </div>
            <div className="mint-panel">
              <div className="mint-ph">
                <h3>By category</h3>
              </div>
              <div style={{ overflowX: "auto" }}>
              <table className="mint-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Budget used</th>
                    <th className="r">Spent</th>
                    <th className="r">Budget</th>
                  </tr>
                </thead>
                <tbody>
                  {spending.map((c, i) => (
                    <tr key={c.categoryId}>
                      <td>
                        <div className="nm">
                          <span
                            className="mint-cchip"
                            style={categoryTile(
                              CHART_PALETTE[i % CHART_PALETTE.length],
                              "expense"
                            )}
                          >
                            <CategoryIcon
                              name={c.categoryName}
                              kind="expense"
                              size={22}
                            />
                          </span>
                          {c.categoryName}
                        </div>
                      </td>
                      <td>
                        {c.limit != null && c.limit > 0 ? (
                          (() => {
                            const pct = (c.spent / c.limit) * 100;
                            const over = c.spent > c.limit;
                            return (
                              <div className="mint-budgetbar">
                                <div className="track">
                                  <div
                                    className="fill"
                                    style={{
                                      width: `${Math.min(100, pct)}%`,
                                      background: over
                                        ? "var(--neg)"
                                        : CHART_PALETTE[i % CHART_PALETTE.length],
                                    }}
                                  />
                                </div>
                                <span className={"pct" + (over ? " over" : "")}>
                                  {Math.round(pct)}%
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="mint-nobudget">No budget</span>
                        )}
                      </td>
                      <td className="r am">{formatCurrency(c.spent)}</td>
                      <td className="r">
                        {c.limit != null ? (
                          formatCurrency(c.limit)
                        ) : (
                          <span className="mint-nobudget">Not set</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {spending.length === 0 && (
                    <tr>
                      <td colSpan={4} className="mint-muted" style={{ paddingTop: 18 }}>
                        Nothing to report for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
