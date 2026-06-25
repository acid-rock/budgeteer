"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SavingsBucket, SavingsMovement, SavingsMovementType } from "@/types";
import { todayDateString } from "@/lib/utils";

interface NewMovement {
  type: SavingsMovementType;
  amount: number;
  date: string;
  categoryId: string;
  note: string;
}

async function createMovement(input: NewMovement): Promise<SavingsMovement> {
  const res = await fetch("/api/savings/movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to record movement");
  }
  return res.json();
}

// Deposit/withdraw against a savings bucket. Modeled on TransactionForm; the
// bucket <select> is fed the savings buckets the page already has.
export function SavingsForm({ buckets }: { buckets: SavingsBucket[] }) {
  const queryClient = useQueryClient();

  const [type, setType] = useState<SavingsMovementType>("deposit");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      queryClient.invalidateQueries({ queryKey: ["savings-movements"] });
      setAmount("");
      setNote("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const chosen = categoryId || buckets[0]?.categoryId;
    if (!chosen) return;
    mutation.mutate({ type, amount: Number(amount), date, categoryId: chosen, note });
  }

  const inputClass = "mint-input";

  return (
    <form
      onSubmit={handleSubmit}
      className="mint-panel mint-formgrid"
      style={{ marginBottom: 16 }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value as SavingsMovementType)}
        className={inputClass}
      >
        <option value="deposit">Deposit</option>
        <option value="withdraw">Withdraw</option>
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
        {buckets.map((b) => (
          <option key={b.categoryId} value={b.categoryId}>
            {b.name}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className={inputClass}
      />

      <button type="submit" disabled={mutation.isPending} className="mint-btn pri">
        {mutation.isPending ? "Saving…" : type === "deposit" ? "+ Deposit" : "− Withdraw"}
      </button>

      {mutation.isError && (
        <p className="mint-err" style={{ gridColumn: "1 / -1" }}>
          {(mutation.error as Error).message}
        </p>
      )}
    </form>
  );
}
