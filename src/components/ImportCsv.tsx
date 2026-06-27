"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface ImportSummary {
  imported: number;
  categoriesCreated: number;
}

async function importCsv(file: File): Promise<ImportSummary> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/transactions/import", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Import failed");
  return data as ImportSummary;
}

// Upload a CSV ledger and import it. Columns are auto-mapped by header on the
// server (matching the export format), and the whole file is rejected on any bad
// row — so success here means every row landed. On success we invalidate the
// same caches a manual entry touches so totals refresh everywhere at once.
export function ImportCsv() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: importCsv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      router.refresh();
    },
  });

  function onPick(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    mutation.mutate(file);
    // Allow re-selecting the same file after a failed import.
    if (inputRef.current) inputRef.current.value = "";
  }

  const summary = mutation.data;
  const error = mutation.error as Error | null;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        className="mint-btn"
        onClick={() => inputRef.current?.click()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Importing…" : "Import CSV"}
      </button>
      {summary && (
        <span className="mint-muted" style={{ fontSize: 12 }}>
          Imported {summary.imported} row{summary.imported === 1 ? "" : "s"}
          {summary.categoriesCreated > 0 &&
            ` · ${summary.categoriesCreated} new categor${
              summary.categoriesCreated === 1 ? "y" : "ies"
            }`}
        </span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "var(--neg)" }}>
          {fileName ? `${fileName}: ` : ""}
          {error.message}
        </span>
      )}
    </div>
  );
}
