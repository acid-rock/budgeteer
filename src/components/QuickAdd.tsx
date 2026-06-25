"use client";

import { useEffect, useRef, useState } from "react";
import type { TransactionType } from "@/types";
import { useTransactionForm } from "@/hooks/useTransactionForm";

// App-wide floating "+" that opens a compact transaction form from any page.
// Reuses useTransactionForm, so the create logic, optimistic insert, and
// cross-view refresh are shared with the inline form on the transactions page.
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const f = useTransactionForm({ onSuccess: () => setOpen(false) });
  const amountRef = useRef<HTMLInputElement>(null);

  // Close on Escape and focus the amount field when the sheet opens.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    amountRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    f.submit();
  }

  const noCategories = f.visibleCategories.length === 0;

  return (
    <>
      <button
        type="button"
        className="mint-fab"
        aria-label="Quick add transaction"
        onClick={() => setOpen(true)}
      >
        +
      </button>

      {open && (
        // Clicking the backdrop closes; mousedown (not click) so a drag that
        // ends inside the dialog doesn't dismiss it.
        <div className="mint-modal-overlay" onMouseDown={() => setOpen(false)}>
          <div
            className="mint-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quick add transaction"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mint-modal-head">
              <h3>Quick add</h3>
              <button
                type="button"
                className="mint-modal-x"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mint-quickform">
              <select
                value={f.type}
                onChange={(e) =>
                  f.handleTypeChange(e.target.value as TransactionType)
                }
                className="mint-input"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Amount"
                value={f.amount}
                onChange={(e) => f.setAmount(e.target.value)}
                className="mint-input"
              />

              <select
                value={f.categoryId}
                onChange={(e) => f.setCategoryId(e.target.value)}
                className="mint-input"
                disabled={noCategories}
              >
                {noCategories ? (
                  <option value="">No {f.type} categories yet</option>
                ) : (
                  f.visibleCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>

              <input
                type="date"
                value={f.date}
                onChange={(e) => f.setDate(e.target.value)}
                className="mint-input"
              />

              <input
                type="text"
                placeholder="Note (optional)"
                value={f.note}
                onChange={(e) => f.setNote(e.target.value)}
                className="mint-input"
              />

              <button
                type="submit"
                disabled={f.isPending || noCategories}
                className="mint-btn pri"
              >
                {f.isPending ? "Adding…" : "Add transaction"}
              </button>

              {f.isError && <p className="mint-err">{f.error?.message}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
