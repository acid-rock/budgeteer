"use client";

import { useQuery } from "@tanstack/react-query";
import { dateToMonthString, formatCurrency } from "@/lib/utils";
import type { Budget, Category } from "@/types";

// SKELETON PAGE — wired enough to show data, but the editing flow is a stub.
// The Budgets API (GET/POST /api/budgets) already supports upserts.

async function fetchBudgets(month: string) {
  const res = await fetch(`/api/budgets?month=${month}`);
  if (!res.ok) throw new Error("Failed to load budgets");
  return res.json() as Promise<(Budget & { category: Category })[]>;
}

export default function BudgetsPage() {
  const month = dateToMonthString();
  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets", month],
    queryFn: () => fetchBudgets(month),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Budgets</h2>
        <p className="text-sm text-slate-500">
          Monthly spending limit per category ({month}).
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading budgets…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Limit</th>
              </tr>
            </thead>
            <tbody>
              {budgets?.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-4 py-2">{b.category?.name}</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(b.limit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO: add an "edit budget" form here.
          Wire a useMutation that POSTs { categoryId, month, limit } to
          /api/budgets (it upserts), then invalidate ["budgets", month].
          List all expense categories so limits can be set for ones without a
          budget yet. */}
      <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
        🚧 Editing budgets is not wired up yet — see the TODO in this file.
      </p>
    </div>
  );
}
