"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SavingsBucket } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { colorForCategory, categoryTile } from "@/lib/colors";
import { CategoryIcon } from "@/lib/category-icon";

async function updateBucket(
  id: string,
  target: number | null
): Promise<unknown> {
  const res = await fetch(`/api/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to update bucket");
  }
  return res.json();
}

async function deleteBucket(id: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to delete bucket");
  }
}

export function SavingsBucketCard({ bucket }: { bucket: SavingsBucket }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState(
    bucket.target != null ? String(bucket.target) : ""
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["savings"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateBucket(bucket.categoryId, target.trim() === "" ? null : Number(target)),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBucket(bucket.categoryId),
    onSuccess: invalidate,
  });

  const color = colorForCategory(bucket.name);
  const hasGoal = bucket.target != null && bucket.target > 0;
  const pct = hasGoal ? Math.min(100, (bucket.balance / bucket.target!) * 100) : 0;
  const reached = hasGoal && bucket.balance >= bucket.target!;
  const toGo = hasGoal ? bucket.target! - bucket.balance : 0;

  function startEdit() {
    setTarget(bucket.target != null ? String(bucket.target) : "");
    saveMutation.reset();
    deleteMutation.reset();
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="mint-catcard">
        <div className="hd">
          <span className="sw" style={categoryTile(color, "savings")}>
            <CategoryIcon name={bucket.name} kind="savings" size={22} />
          </span>
          <div className="nm" style={{ flex: 1, minWidth: 0 }}>
            {bucket.name}
          </div>
        </div>
        <label
          className="mint-muted"
          style={{ fontSize: 12.5, fontWeight: 600, display: "block", marginBottom: 6 }}
        >
          Savings goal (optional)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="No goal"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mint-input"
          style={{ width: "100%", textAlign: "right" }}
          autoFocus
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button
            className="mint-btn pri"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
          <button className="mint-btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <button
            className="mint-btn danger"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              if (confirm(`Delete the "${bucket.name}" bucket?`))
                deleteMutation.mutate();
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
        {(saveMutation.isError || deleteMutation.isError) && (
          <p className="mint-err" style={{ marginTop: 10 }}>
            {((saveMutation.error ?? deleteMutation.error) as Error).message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mint-catcard">
      <div className="hd">
        <span className="sw" style={categoryTile(color, "savings")}>
          <CategoryIcon name={bucket.name} kind="savings" size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">{bucket.name}</div>
          {bucket.target != null ? (
            <span className="ty inc">Goal {formatCurrency(bucket.target)}</span>
          ) : (
            <span
              className="mint-muted"
              style={{ fontSize: 12, display: "block", marginTop: 4 }}
            >
              No goal set
            </span>
          )}
        </div>
        <button className="mint-edit" onClick={startEdit} title="Edit bucket">
          Edit
        </button>
      </div>

      {hasGoal && (
        <>
          <div className="mint-btrack">
            <div
              className="fill"
              style={{
                width: `${pct}%`,
                background: reached ? "var(--pos)" : "var(--green2)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 8,
              marginBottom: 4,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--muted)",
            }}
          >
            <span>{Math.round(pct)}% of goal</span>
            {reached ? (
              <span className="mint-left">Goal reached</span>
            ) : (
              <span>{formatCurrency(toGo)} to go</span>
            )}
          </div>
        </>
      )}

      <div className="stat">
        <span className="k">Balance</span>
        <span className="v">{formatCurrency(bucket.balance)}</span>
      </div>
    </div>
  );
}
