"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Category, Transaction, TransactionType } from "@/types";
import { byKind, formatCurrency } from "@/lib/utils";
import { colorForCategory, categoryTile } from "@/lib/colors";
import { CategoryIcon } from "@/lib/category-icon";

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
  const visibleCategories = byKind(categories, type);

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

  const categoryName = transaction.category?.name ?? "—";
  const color = colorForCategory(categoryName);

  if (editing) {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          padding: "14px 0",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mint-input"
        />
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
          className="mint-input"
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mint-input"
        >
          {visibleCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={note}
          placeholder="Note"
          onChange={(e) => setNote(e.target.value)}
          className="mint-input"
          style={{ flex: 1, minWidth: 140 }}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mint-input"
          style={{ width: 120, textAlign: "right" }}
        />
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="mint-btn pri"
        >
          {updateMutation.isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="mint-btn">
          Cancel
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this transaction?")) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="mint-btn danger"
        >
          {deleteMutation.isPending ? "Deleting…" : "Delete"}
        </button>
        {(updateMutation.isError || deleteMutation.isError) && (
          <p className="mint-err" style={{ width: "100%" }}>
            {((updateMutation.error ?? deleteMutation.error) as Error).message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="mint-row"
      style={{ cursor: "pointer" }}
      onClick={startEditing}
      title="Edit transaction"
    >
      <div className="mint-ic" style={categoryTile(color, transaction.type)}>
        <CategoryIcon name={categoryName} kind={transaction.type} size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          className="nm"
          style={{ overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {transaction.note?.trim() || categoryName}
        </div>
        <div className="mt">
          <span className="mint-tag">
            <span className="d" style={{ background: color }} />
            {categoryName}
          </span>
        </div>
      </div>
      <div className={"am" + (transaction.type === "income" ? " pos" : "")}>
        {transaction.type === "income" ? "+" : "−"}
        {formatCurrency(transaction.amount)}
      </div>
    </div>
  );
}
