"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Category, Transaction, TransactionType } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

async function updateTransaction(
  id: string,
  input: Partial<Transaction>
): Promise<Transaction> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update transaction");
  }
  return res.json();
}

async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete transaction");
  }
}

const cellInput =
  "w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none";

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // Draft state for edit mode, seeded from the current transaction.
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [note, setNote] = useState(transaction.note ?? "");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: editing, // only load category options when actually editing
  });
  const visibleCategories =
    categories?.filter((c) => c.kind === type) ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const updateMutation = useMutation({
    mutationFn: (input: Partial<Transaction>) =>
      updateTransaction(transaction.id, input),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTransaction(transaction.id),
    onSuccess: invalidate,
  });

  function startEditing() {
    // Reset the draft to the latest values before opening the editor.
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDate(transaction.date.slice(0, 10));
    setCategoryId(transaction.categoryId);
    setNote(transaction.note ?? "");
    setEditing(true);
  }

  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategoryId(""); // category sets differ per type; force a re-pick
  }

  function handleSave() {
    const chosenCategory = categoryId || visibleCategories[0]?.id;
    if (!chosenCategory) return;
    updateMutation.mutate({
      type,
      amount: Number(amount),
      date,
      categoryId: chosenCategory,
      note,
    });
  }

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td className="px-4 py-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex flex-col gap-1">
            <select
              value={type}
              onChange={(e) =>
                handleTypeChange(e.target.value as TransactionType)
              }
              className={cellInput}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={cellInput}
            >
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={note}
            placeholder="Note"
            onChange={(e) => setNote(e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${cellInput} text-right`}
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
          {updateMutation.isError && (
            <p className="mt-1 text-right text-xs text-red-600">
              {(updateMutation.error as Error).message}
            </p>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-2 text-slate-600">
        {formatDate(transaction.date)}
      </td>
      <td className="px-4 py-2">{transaction.category?.name ?? "—"}</td>
      <td className="px-4 py-2 text-slate-500">{transaction.note ?? ""}</td>
      <td
        className={`px-4 py-2 text-right font-medium ${
          transaction.type === "income" ? "text-green-600" : "text-slate-900"
        }`}
      >
        {transaction.type === "income" ? "+" : "−"}
        {formatCurrency(transaction.amount)}
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-end gap-2">
          <button
            onClick={startEditing}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this transaction?")) deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}
