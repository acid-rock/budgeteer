"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dateToMonthString } from "@/lib/utils";
import { BudgetRow } from "@/components/BudgetRow";
import type { Budget, Category } from "@/types";

interface BudgetWithCategory extends Budget {
  category?: Category;
}

// Fetch the full list under the shared ["categories"] cache key (the same key
// and shape other pages use). Filtering to expenses happens in the component —
// doing it here would corrupt the shared cache for pages that need all kinds.
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

export default function BudgetsPage() {
  const [month, setMonth] = useState(dateToMonthString());

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Budgets apply to expense categories only.
  const expenseCategories =
    categories?.filter((c) => c.kind === "expense") ?? [];
  const { data: budgets, isLoading: loadingBudgets } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => fetchBudgets(month),
  });

  // Map categoryId -> existing budget for the selected month.
  const budgetByCategory = new Map(
    budgets?.map((b) => [b.categoryId, b]) ?? []
  );

  const loading = loadingCategories || loadingBudgets;

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Budgets</h1>
          <p>Set a monthly spending limit per category.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mint-input"
        />
      </div>

      {loading ? (
        <p className="mint-muted">Loading budgets…</p>
      ) : expenseCategories.length === 0 ? (
        <p className="mint-muted">
          No expense categories yet — add one to set budgets.
        </p>
      ) : (
        <div className="mint-tablewrap">
          <table className="mint-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="r">Monthly limit</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenseCategories.map((c) => (
                <BudgetRow
                  key={c.id}
                  category={c}
                  budget={budgetByCategory.get(c.id)}
                  month={month}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
