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

const inputClass =
  "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-slate-500 focus:outline-none";

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
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td className="px-4 py-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </td>
        <td className="px-4 py-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CategoryKind)}
            className={inputClass}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!name.trim() || updateMutation.isPending}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-40"
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
      <td className="px-4 py-2 font-medium">{category.name}</td>
      <td className="px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            category.kind === "income"
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {category.kind}
        </span>
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
              if (confirm(`Delete the "${category.name}" category?`))
                deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
            className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
        {deleteMutation.isError && (
          <p className="mt-1 text-right text-xs text-red-600">
            {(deleteMutation.error as Error).message}
          </p>
        )}
      </td>
    </tr>
  );
}
