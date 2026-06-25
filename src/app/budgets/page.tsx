"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dateToMonthString, formatCurrency } from "@/lib/utils";
import { BudgetRow } from "@/components/BudgetRow";
import { AutoBudgetPanel } from "@/components/AutoBudgetPanel";
import { BudgetsSkeleton } from "@/components/Skeletons";
import type { Budget, Category, MonthlyReport } from "@/types";

interface BudgetWithCategory extends Budget {
  category?: Category;
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

async function fetchBudgets(month: string): Promise<BudgetWithCategory[]> {
  const res = await fetch(`/api/budgets?month=${month}`);
  if (!res.ok) throw new Error("Failed to load budgets");
  return res.json();
}

// Spent-per-category comes from the same monthly aggregation the Reports page
// uses, so the bars reflect real activity without a new endpoint.
async function fetchReport(month: string): Promise<MonthlyReport> {
  const res = await fetch(`/api/reports?month=${month}`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

export default function BudgetsPage() {
  const [month, setMonth] = useState(dateToMonthString());
  const [showAuto, setShowAuto] = useState(false);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => fetchBudgets(month),
  });
  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["report", month],
    queryFn: () => fetchReport(month),
  });

  // Budgets apply to expense categories only.
  const expenseCategories =
    categories?.filter((c) => c.kind === "expense") ?? [];
  const budgetByCategory = new Map(
    budgets?.map((b) => [b.categoryId, b]) ?? []
  );
  const spentByCategory = new Map(
    report?.byCategory.map((r) => [r.categoryId, r.spent]) ?? []
  );

  const loading = loadingCategories || loadingBudgets || loadingReport;

  // Summary stats are computed over the categories that actually have a budget.
  const budgeted = expenseCategories.filter((c) =>
    budgetByCategory.has(c.id)
  );
  const totalBudget = budgeted.reduce(
    (s, c) => s + Number(budgetByCategory.get(c.id)!.limit),
    0
  );
  const totalSpent = budgeted.reduce(
    (s, c) => s + (spentByCategory.get(c.id) ?? 0),
    0
  );
  const remaining = totalBudget - totalSpent;

  const [y, m] = month.split("-").map(Number);
  const monthDate = new Date(Date.UTC(y, m - 1, 1));
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate);
  const monthShort = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(monthDate);

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Budgets</h1>
          <p>Set limits and track what&rsquo;s left for {monthShort}.</p>
        </div>
        <div className="mint-cta">
          <button
            type="button"
            className="mint-btn pri"
            onClick={() => setShowAuto(true)}
          >
            Auto-budget
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mint-input"
          />
        </div>
      </div>

      {showAuto && (
        <AutoBudgetPanel month={month} onClose={() => setShowAuto(false)} />
      )}

      {loading ? (
        <BudgetsSkeleton />
      ) : expenseCategories.length === 0 ? (
        <p className="mint-muted">
          No expense categories yet — add one to set budgets.
        </p>
      ) : (
        <>
          <div className="mint-stats">
            <div className="mint-stat">
              <div className="lbl">Total budget</div>
              <div className="val num">{formatCurrency(totalBudget)}</div>
              <div className="sub">
                {budgeted.length}{" "}
                {budgeted.length === 1 ? "category" : "categories"}
              </div>
            </div>
            <div className="mint-stat">
              <div className="lbl">Spent so far</div>
              <div className="val num">{formatCurrency(totalSpent)}</div>
              {totalBudget > 0 && (
                <div className="sub">
                  {Math.round((totalSpent / totalBudget) * 100)}% of budget used
                </div>
              )}
            </div>
            <div className="mint-stat feat">
              <div className="lbl">Remaining</div>
              <div className="val num">{formatCurrency(remaining)}</div>
              <div className="sub">Across all budgets this month</div>
            </div>
          </div>

          <div className="mint-panel">
            <div className="mint-ph">
              <h3>Monthly budgets</h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {monthLabel}
              </span>
            </div>
            <div className="mint-budget">
              {expenseCategories.map((c) => (
                <BudgetRow
                  key={c.id}
                  category={c}
                  budget={budgetByCategory.get(c.id)}
                  spent={spentByCategory.get(c.id) ?? 0}
                  month={month}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
