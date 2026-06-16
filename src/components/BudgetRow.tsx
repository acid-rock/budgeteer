"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Budget, Category } from "@/types";

interface BudgetWithCategory extends Budget {
  category?: Category;
}

async function upsertBudget(input: {
  categoryId: string;
  month: string;
  limit: number;
}): Promise<BudgetWithCategory> {
  const res = await fetch("/api/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to save budget");
  }
  return res.json();
}

async function deleteBudget(id: string): Promise<void> {
  const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete budget");
  }
}

const inputClass = "mint-input w-32 text-right";

export function BudgetRow({
  category,
  budget,
  month,
}: {
  category: Category;
  budget?: BudgetWithCategory;
  month: string;
}) {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(budget ? String(budget.limit) : "");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["budgets", month] });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertBudget({
        categoryId: category.id,
        month,
        limit: Number(limit),
      }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBudget(budget!.id),
    onSuccess: () => {
      setLimit("");
      invalidate();
    },
  });

  // Has the input diverged from what's stored? Drives the Save button state.
  const stored = budget ? String(budget.limit) : "";
  const dirty = limit.trim() !== stored;

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{category.name}</td>
      <td className="r">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="No budget"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className={inputClass}
        />
      </td>
      <td>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || limit.trim() === "" || saveMutation.isPending}
            className="mint-btn pri"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
          {budget && (
            <button
              onClick={() => {
                if (confirm(`Remove the budget for ${category.name}?`))
                  deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="mint-btn danger"
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </button>
          )}
        </div>
        {(saveMutation.isError || deleteMutation.isError) && (
          <p className="mint-err mt-1 text-right">
            {((saveMutation.error ?? deleteMutation.error) as Error).message}
          </p>
        )}
      </td>
    </tr>
  );
}
