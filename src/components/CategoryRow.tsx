"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Category, CategoryKind } from "@/types";
import type { CategoryStat } from "@/app/api/categories/stats/route";
import { formatCurrency } from "@/lib/utils";
import { colorForCategory } from "@/lib/colors";

async function updateCategory(
  id: string,
  input: { name: string; kind: CategoryKind }
): Promise<Category> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update category");
  }
  return res.json();
}

async function deleteCategory(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete category");
  }
}

export function CategoryCard({
  category,
  stat,
}: {
  category: Category;
  stat?: CategoryStat;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [kind, setKind] = useState<CategoryKind>(category.kind);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["category-stats"] });
  };

  const updateMutation = useMutation({
    mutationFn: () => updateCategory(category.id, { name: name.trim(), kind }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCategory(category.id),
    onSuccess: invalidate,
  });

  function startEditing() {
    setName(category.name);
    setKind(category.kind);
    updateMutation.reset();
    deleteMutation.reset();
    setEditing(true);
  }

  const income = category.kind === "income";
  const color = colorForCategory(category.name);
  const count = stat?.count ?? 0;
  const total = stat?.total ?? 0;

  if (editing) {
    return (
      <div className="mint-catcard">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mint-input"
            placeholder="Category name"
            autoFocus
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
            className="mint-input"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!name.trim() || updateMutation.isPending}
              className="mint-btn pri"
            >
              {updateMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="mint-btn">
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete the "${category.name}" category?`))
                  deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="mint-btn danger"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
          {(updateMutation.isError || deleteMutation.isError) && (
            <p className="mint-err">
              {((updateMutation.error ?? deleteMutation.error) as Error).message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mint-catcard"
      style={{ cursor: "pointer" }}
      onClick={startEditing}
      title="Edit category"
    >
      <div className="hd">
        <div className="sw" style={{ background: color }}>
          <div className="g" />
        </div>
        <div>
          <div className="nm">{category.name}</div>
          <span className={"ty " + (income ? "inc" : "exp")}>
            {income ? "Income" : "Expense"}
          </span>
        </div>
      </div>
      <div className="stat">
        <div className="k">
          {count} transaction{count === 1 ? "" : "s"}
        </div>
        <div className="v num">{formatCurrency(total)}</div>
      </div>
    </div>
  );
}
