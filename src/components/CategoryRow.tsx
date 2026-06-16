"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Category, CategoryKind } from "@/types";

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

const inputClass = "mint-input";

export function CategoryRow({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [kind, setKind] = useState<CategoryKind>(category.kind);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

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
    deleteMutation.reset();
    setEditing(true);
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </td>
        <td>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </td>
        <td>
          <div className="flex justify-end gap-2">
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
          </div>
          {updateMutation.isError && (
            <p className="mint-err mt-1 text-right">
              {(updateMutation.error as Error).message}
            </p>
          )}
        </td>
      </tr>
    );
  }

  const income = category.kind === "income";
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{category.name}</td>
      <td>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 9px",
            borderRadius: 999,
            textTransform: "capitalize",
            background: income ? "rgba(14,138,80,0.12)" : "rgba(216,85,60,0.12)",
            color: income ? "var(--pos)" : "var(--neg)",
          }}
        >
          {category.kind}
        </span>
      </td>
      <td>
        <div className="flex justify-end gap-2">
          <button onClick={startEditing} className="mint-btn">
            Edit
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
        {deleteMutation.isError && (
          <p className="mint-err mt-1 text-right">
            {(deleteMutation.error as Error).message}
          </p>
        )}
      </td>
    </tr>
  );
}
