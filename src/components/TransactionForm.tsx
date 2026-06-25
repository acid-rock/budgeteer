"use client";

import type { TransactionType } from "@/types";
import { useTransactionForm } from "@/hooks/useTransactionForm";

export function TransactionForm() {
  const f = useTransactionForm();
  const inputClass = "mint-input";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    f.submit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mint-panel mint-formgrid"
      style={{ marginBottom: 16 }}
    >
      <select
        value={f.type}
        onChange={(e) => f.handleTypeChange(e.target.value as TransactionType)}
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
        value={f.amount}
        onChange={(e) => f.setAmount(e.target.value)}
        className={inputClass}
      />

      <input
        type="date"
        value={f.date}
        onChange={(e) => f.setDate(e.target.value)}
        className={inputClass}
      />

      <select
        value={f.categoryId}
        onChange={(e) => f.setCategoryId(e.target.value)}
        className={inputClass}
      >
        {f.visibleCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Note (optional)"
        value={f.note}
        onChange={(e) => f.setNote(e.target.value)}
        className={inputClass}
      />

      <button type="submit" disabled={f.isPending} className="mint-btn pri">
        {f.isPending ? "Adding…" : "+ Add"}
      </button>

      {f.isError && (
        <p className="mint-err" style={{ gridColumn: "1 / -1" }}>
          {f.error?.message}
        </p>
      )}
    </form>
  );
}
