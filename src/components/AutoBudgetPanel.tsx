"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { BudgetSuggestion } from "@/types";

interface SuggestResponse {
  month: string;
  suggestions: BudgetSuggestion[];
}

interface RowState {
  checked: boolean;
  limit: string;
}

async function fetchSuggestions(month: string): Promise<SuggestResponse> {
  const res = await fetch(`/api/budgets/suggest?month=${month}`);
  if (!res.ok) throw new Error("Failed to load suggestions");
  return res.json();
}

async function applyBulk(input: {
  month: string;
  items: { categoryId: string; limit: number }[];
}): Promise<unknown> {
  const res = await fetch("/api/budgets/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to apply budgets");
  }
  return res.json();
}

// "2026-05" → "May 2026" (UTC so the label never shifts a month).
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function AutoBudgetPanel({
  month,
  onClose,
}: {
  month: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["budget-suggest", month],
    queryFn: () => fetchSuggestions(month),
  });

  // Per-row draft: whether it's selected and its (editable) limit. Seeded from
  // the suggestions once they load, defaulting every row to checked. Seeding is
  // done during render — guarded by `seededMonth` so it runs once per dataset —
  // rather than in an effect, which would cascade renders.
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [seededMonth, setSeededMonth] = useState<string | null>(null);

  if (data && seededMonth !== month) {
    const init: Record<string, RowState> = {};
    for (const s of data.suggestions) {
      init[s.categoryId] = {
        checked: true,
        limit: s.suggested ? String(s.suggested) : "",
      };
    }
    setRows(init);
    setSeededMonth(month);
  }

  // Close on Escape, matching the month-switcher dropdown.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const applyMutation = useMutation({
    mutationFn: applyBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets", month] });
      queryClient.invalidateQueries({ queryKey: ["report", month] });
      onClose();
    },
  });

  const suggestions = data?.suggestions ?? [];
  const selected = suggestions.filter((s) => rows[s.categoryId]?.checked);

  function toggle(id: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], checked: !r[id]?.checked } }));
  }
  function setLimit(id: string, limit: string) {
    setRows((r) => ({ ...r, [id]: { ...r[id], limit } }));
  }

  function apply() {
    const items = selected.map((s) => ({
      categoryId: s.categoryId,
      limit: Number(rows[s.categoryId]?.limit || 0),
    }));
    applyMutation.mutate({ month, items });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(22, 36, 28, 0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px",
        overflowY: "auto",
      }}
    >
      <div
        className="mint-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 620 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="mint-ph">
          <h3>Auto-budget · {monthLabel(month)}</h3>
          <button className="mint-edit" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="mint-muted" style={{ marginTop: -8, marginBottom: 16 }}>
          Suggested from your average spend over the previous 3 months. Edit or
          deselect any row before applying.
        </p>

        {isLoading ? (
          <p className="mint-muted">Loading suggestions…</p>
        ) : isError ? (
          <p className="mint-err">{(error as Error).message}</p>
        ) : suggestions.length === 0 ? (
          <p className="mint-muted">
            No expense categories yet — add one to get suggestions.
          </p>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="mint-table">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Category</th>
                    <th className="r">Current</th>
                    <th className="r">Suggested</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((s) => {
                    const row = rows[s.categoryId];
                    const overwrites = s.existingLimit != null;
                    return (
                      <tr key={s.categoryId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={row?.checked ?? false}
                            onChange={() => toggle(s.categoryId)}
                            aria-label={`Include ${s.categoryName}`}
                          />
                        </td>
                        <td>{s.categoryName}</td>
                        <td className="r">
                          {s.existingLimit != null ? (
                            <span style={{ color: "var(--neg)", fontWeight: 600 }}>
                              {formatCurrency(s.existingLimit)}
                            </span>
                          ) : (
                            <span className="mint-nobudget">None</span>
                          )}
                        </td>
                        <td className="r">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row?.limit ?? ""}
                            onChange={(e) => setLimit(s.categoryId, e.target.value)}
                            disabled={!row?.checked}
                            className="mint-input"
                            style={{ width: 120, textAlign: "right" }}
                            title={
                              overwrites
                                ? "This will overwrite the current limit"
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                className="mint-btn pri"
                onClick={apply}
                disabled={selected.length === 0 || applyMutation.isPending}
              >
                {applyMutation.isPending
                  ? "Applying…"
                  : `Apply selected (${selected.length})`}
              </button>
              <button className="mint-btn" onClick={onClose}>
                Cancel
              </button>
              {applyMutation.isError && (
                <p className="mint-err" style={{ margin: 0 }}>
                  {(applyMutation.error as Error).message}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
