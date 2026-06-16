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

  const inputClass = "mint-input";

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Categories</h1>
          <p>Organize where your money comes from and goes.</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mint-panel"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          required
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          style={{ flex: 1, minWidth: 200 }}
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
          className="mint-btn pri"
        >
          {createMutation.isPending ? "Adding…" : "+ New category"}
        </button>
        {createMutation.isError && (
          <p className="mint-err" style={{ width: "100%" }}>
            {(createMutation.error as Error).message}
          </p>
        )}
      </form>

      {isLoading ? (
        <p className="mint-muted">Loading categories…</p>
      ) : !categories || categories.length === 0 ? (
        <p className="mint-muted">No categories yet — add one above.</p>
      ) : (
        <div className="mint-tablewrap">
          <table className="mint-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th className="r">Actions</th>
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
    </>
  );
}
