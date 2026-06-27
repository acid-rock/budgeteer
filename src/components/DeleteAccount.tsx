"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// "Danger zone" account deletion. Two-step: the user opens the confirm panel,
// is nudged to export their data first, and must type DELETE to enable the
// final button. On success the server has already cleared the session cookie,
// so we just bounce to /login.
export function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === "DELETE" && !pending;

  async function handleDelete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete account");
      }
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <section
      className="mint-panel"
      style={{ borderColor: "rgba(216,85,60,0.35)", marginBottom: 16 }}
    >
      <div className="mint-ph">
        <h3 style={{ color: "var(--neg)" }}>Danger zone</h3>
      </div>
      <p className="mint-muted" style={{ fontSize: 13, marginTop: 0 }}>
        Permanently delete your account and all of its data — transactions,
        categories, budgets, and connected sign-in providers. This cannot be
        undone.
      </p>

      {!open ? (
        <button className="mint-btn danger" onClick={() => setOpen(true)}>
          Delete account
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <a className="mint-btn" href="/api/transactions/export" download>
            Export my data first
          </a>
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Type <code>DELETE</code> to confirm
            <input
              className="mint-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              style={{ marginTop: 6, width: "100%" }}
            />
          </label>
          {error && (
            <p className="mint-err" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="mint-btn danger"
              onClick={handleDelete}
              disabled={!canDelete}
            >
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              className="mint-btn"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
