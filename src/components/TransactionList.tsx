"use client";

import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch("/api/transactions");
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

export function TransactionList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: fetchTransactions,
  });

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading transactions…</p>;
  }
  if (isError) {
    return (
      <p className="text-sm text-red-600">{(error as Error).message}</p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No transactions yet — add one above.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Note</th>
            <th className="px-4 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2 text-slate-600">{formatDate(t.date)}</td>
              <td className="px-4 py-2">{t.category?.name ?? "—"}</td>
              <td className="px-4 py-2 text-slate-500">{t.note ?? ""}</td>
              <td
                className={`px-4 py-2 text-right font-medium ${
                  t.type === "income" ? "text-green-600" : "text-slate-900"
                }`}
              >
                {t.type === "income" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
