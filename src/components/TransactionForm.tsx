"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Category, Transaction, TransactionType } from "@/types";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

interface NewTransaction {
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  note: string;
}

async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const res = await fetch("/api/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create transaction");
  }
  return res.json();
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function TransactionForm() {
  const queryClient = useQueryClient();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  // Income and expense have distinct category sets (Category.kind), so only
  // show the ones matching the selected type.
  const visibleCategories = categories?.filter((c) => c.kind === type) ?? [];

  // When the type switches, clear any selection so we don't keep a category
  // that belongs to the other kind.
  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategoryId("");
  }

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      // Re-fetch the list so the new row appears immediately.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setAmount("");
      setNote("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosenCategory = categoryId || visibleCategories[0]?.id;
    if (!chosenCategory) return;
    mutation.mutate({
      type,
      amount: Number(amount),
      date,
      categoryId: chosenCategory,
      note,
    });
  }

  const inputClass =
    "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-6"
    >
      <select
        value={type}
        onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
        className={inputClass}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>

      <input
        type="number"
        step="0.01"
        min="0"
        required
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={inputClass}
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={inputClass}
      />

      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className={inputClass}
      >
        {visibleCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={`${inputClass} sm:col-span-1`}
      />

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {mutation.isPending ? "Adding…" : "Add"}
      </button>

      {mutation.isError && (
        <p className="col-span-full text-sm text-red-600">
          {(mutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
