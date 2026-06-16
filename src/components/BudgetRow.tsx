"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Budget, Category } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { colorForCategory } from "@/lib/colors";

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

export function BudgetRow({
  category,
  budget,
  spent,
  month,
}: {
  category: Category;
  budget?: BudgetWithCategory;
  spent: number;
  month: string;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [limit, setLimit] = useState(budget ? String(budget.limit) : "");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["budgets", month] });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertBudget({ categoryId: category.id, month, limit: Number(limit) }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBudget(budget!.id),
    onSuccess: () => {
      setLimit("");
      invalidate();
      setEditing(false);
    },
  });

  const color = colorForCategory(category.name);
  const limitNum = budget ? Number(budget.limit) : 0;
  const hasBudget = !!budget && limitNum > 0;
  const usedPct = hasBudget ? Math.round((spent / limitNum) * 100) : 0;
  const fillPct = hasBudget ? Math.min(100, (spent / limitNum) * 100) : 0;
  const over = hasBudget && spent > limitNum;
  const left = limitNum - spent;

  function startEdit() {
    setLimit(budget ? String(budget.limit) : "");
    saveMutation.reset();
    deleteMutation.reset();
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="mint-brow">
        <div className="top">
          <span className="mint-dot" style={{ background: color }} />
          <span className="nm">{category.name}</span>
          <div
            style={{
              marginLeft: "auto",
              flex: "1 1 auto",
              minWidth: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Monthly limit"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="mint-input"
              style={{ width: 140, textAlign: "right" }}
              autoFocus
            />
            <button
              className="mint-btn pri"
              onClick={() => saveMutation.mutate()}
              disabled={limit.trim() === "" || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button className="mint-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            {budget && (
              <button
                className="mint-btn danger"
                onClick={() => {
                  if (confirm(`Remove the budget for ${category.name}?`))
                    deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Removing…" : "Remove"}
              </button>
            )}
          </div>
        </div>
        {(saveMutation.isError || deleteMutation.isError) && (
          <p className="mint-err" style={{ marginTop: 8 }}>
            {((saveMutation.error ?? deleteMutation.error) as Error).message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mint-brow">
      <div className="top">
        <span className="mint-dot" style={{ background: color }} />
        <span className="nm">{category.name}</span>
        <span className="nums">
          {hasBudget ? (
            <>
              <b>{formatCurrency(spent)}</b>{" "}
              <span className="of">/ {formatCurrency(limitNum)}</span>
            </>
          ) : (
            <span className="of">No budget set</span>
          )}
        </span>
        <button className="mint-edit" onClick={startEdit} title="Edit budget">
          {hasBudget ? "Edit" : "Set"}
        </button>
      </div>
      {hasBudget && (
        <>
          <div className="mint-btrack">
            <div
              className="fill"
              style={{
                width: `${fillPct}%`,
                background: over ? "var(--neg)" : color,
              }}
            />
          </div>
          <div className="foot">
            <span>{usedPct}% used</span>
            {over ? (
              <span className="mint-over">
                Over by {formatCurrency(Math.abs(left))}
              </span>
            ) : (
              <span className="mint-left">{formatCurrency(left)} left</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
