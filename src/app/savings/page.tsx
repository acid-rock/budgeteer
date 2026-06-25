"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { SavingsForm } from "@/components/SavingsForm";
import { SavingsBucketCard } from "@/components/SavingsBucketCard";
import { SavingsMovementList } from "@/components/SavingsMovementList";
import type { SavingsSummary } from "@/types";

async function fetchSavings(): Promise<SavingsSummary> {
  const res = await fetch("/api/savings");
  if (!res.ok) throw new Error("Failed to load savings");
  return res.json();
}

async function createBucket(input: {
  name: string;
  target: number | null;
}): Promise<unknown> {
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, kind: "savings" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to create bucket");
  }
  return res.json();
}

export default function SavingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["savings"],
    queryFn: fetchSavings,
  });

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const createMutation = useMutation({
    mutationFn: createBucket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings"] });
      setName("");
      setTarget("");
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      target: target.trim() === "" ? null : Number(target),
    });
  }

  const buckets = data?.buckets ?? [];
  const totalSaved = data?.totalSaved ?? 0;
  const withGoals = buckets.filter((b) => b.target != null && b.target > 0);
  const totalTarget = withGoals.reduce((s, b) => s + (b.target ?? 0), 0);
  const goalPct =
    totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <>
      <div className="mint-head">
        <div>
          <h1>Savings</h1>
          <p>Set money aside into buckets — kept separate from your spending.</p>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
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
          placeholder="New bucket name (e.g. Emergency fund)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mint-input"
          style={{ flex: 1, minWidth: 200 }}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="Goal (optional)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mint-input"
          style={{ width: 180 }}
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="mint-btn pri"
        >
          {createMutation.isPending ? "Adding…" : "+ New savings bucket"}
        </button>
        {createMutation.isError && (
          <p className="mint-err" style={{ width: "100%" }}>
            {(createMutation.error as Error).message}
          </p>
        )}
      </form>

      {isLoading ? (
        <p className="mint-muted">Loading savings…</p>
      ) : (
        <>
          <div className="mint-stats">
            <div className="mint-stat feat">
              <div className="lbl">Total saved</div>
              <div className="val num">{formatCurrency(totalSaved)}</div>
              <div className="sub">
                Across {buckets.length}{" "}
                {buckets.length === 1 ? "bucket" : "buckets"}
              </div>
            </div>
            <div className="mint-stat">
              <div className="lbl">Buckets with a goal</div>
              <div className="val num">{withGoals.length}</div>
              <div className="sub">
                {buckets.length - withGoals.length} without a goal
              </div>
            </div>
            <div className="mint-stat">
              <div className="lbl">Toward goals</div>
              <div className="val num">
                {totalTarget > 0 ? `${goalPct}%` : "—"}
              </div>
              {totalTarget > 0 && (
                <div className="sub">of {formatCurrency(totalTarget)} total</div>
              )}
            </div>
          </div>

          {buckets.length === 0 ? (
            <p className="mint-muted">
              No savings buckets yet — create one above to start setting money aside.
            </p>
          ) : (
            <>
              <SavingsForm buckets={buckets} />

              <div className="mint-catgrid" style={{ marginBottom: 16 }}>
                {buckets.map((b) => (
                  <SavingsBucketCard key={b.categoryId} bucket={b} />
                ))}
              </div>

              <div className="mint-ph">
                <h3>Recent movements</h3>
              </div>
              <SavingsMovementList />
            </>
          )}
        </>
      )}
    </>
  );
}
