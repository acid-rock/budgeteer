"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dateToMonthString } from "@/lib/utils";
import { BudgetRow } from "@/components/BudgetRow";
import type { Budget, Category } from "@/types";

interface BudgetWithCategory extends Budget {
  category?: Category;
}

async function fetchExpenseCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  const all = (await res.json()) as Category[];
  // Budgets only apply to expense categories.
  return all.filter((c) => c.kind === "expense");
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
    queryFn: fetchExpenseCategories,
  });
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Budgets</h2>
          <p className="text-sm text-slate-500">
            Set a monthly spending limit per category.
          </p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading budgets…</p>
      ) : !categories || categories.length === 0 ? (
        <p className="text-sm text-slate-500">
          No expense categories yet — add one to set budgets.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">
                  Monthly Limit
                </th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
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
    </div>
  );
}
