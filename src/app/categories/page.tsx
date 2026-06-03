"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CategoryRow } from "@/components/CategoryRow";
import type { Category, CategoryKind } from "@/types";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

async function createCategory(input: {
  name: string;
  kind: CategoryKind;
}): Promise<Category> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create category");
  }
  return res.json();
}

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), kind });
  }

  const inputClass =
    "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Categories</h2>
        <p className="text-sm text-slate-500">
          Manage the income and expense categories used across the app.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <input
          type="text"
          required
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as CategoryKind)}
          className={inputClass}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {createMutation.isPending ? "Adding…" : "Add"}
        </button>
        {createMutation.isError && (
          <p className="w-full text-sm text-red-600">
            {(createMutation.error as Error).message}
          </p>
        )}
      </form>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading categories…</p>
      ) : !categories || categories.length === 0 ? (
        <p className="text-sm text-slate-500">
          No categories yet — add one above.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Kind</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <CategoryRow key={c.id} category={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
