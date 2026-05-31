"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { dateToMonthString, formatCurrency } from "@/lib/utils";
import type { MonthlyReport } from "@/types";

// SKELETON PAGE — the aggregation already happens server-side in
// /api/reports. This page fetches and shows the totals; the per-category
// budget-vs-actual visualization is left as a TODO.

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Monthly Report</h2>
          <p className="text-sm text-slate-500">
            Income, expenses, and category breakdown.
          </p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-slate-500">Loading report…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Total Income" value={data.totalIncome} />
            <Stat label="Total Expenses" value={data.totalExpenses} />
            <Stat label="Net Savings" value={data.netSavings} />
          </div>

          {/* TODO: render budget vs. actual per category.
              `data.byCategory` already includes { categoryName, spent, limit }.
              Add a progress bar per row (spent / limit), highlight overspend in
              red, and consider a chart for the category breakdown. */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Spent</th>
                  <th className="px-4 py-2 text-right font-medium">Budget</th>
                </tr>
              </thead>
              <tbody>
                {data.byCategory.map((row) => (
                  <tr
                    key={row.categoryId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2">{row.categoryName}</td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(row.spent)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">
                      {row.limit != null ? formatCurrency(row.limit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatCurrency(value)}</p>
    </div>
  );
}
