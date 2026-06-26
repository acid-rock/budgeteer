// RFC 4180-style CSV helpers. Pure and dependency-free so they're easy to test
// and reuse (export now; the import flow will share the column format later).

// Quote a field only when it contains a comma, double-quote, or newline; escape
// any inner double-quotes by doubling them.
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsvRow(fields: Array<string | number>): string {
  return fields.map((f) => csvEscape(String(f))).join(",");
}

// Column order for the transaction ledger export (and the future import format).
export const TRANSACTION_CSV_COLUMNS = [
  "Date",
  "Type",
  "Category",
  "Note",
  "Amount",
] as const;

export interface CsvTransaction {
  date: string; // YYYY-MM-DD
  type: string;
  categoryName: string;
  note: string | null;
  amount: number;
}

// Map a transaction to the cell values in TRANSACTION_CSV_COLUMNS order.
export function transactionCsvFields(
  t: CsvTransaction
): Array<string | number> {
  return [t.date, t.type, t.categoryName, t.note ?? "", t.amount];
}

// ─── Import (parsing) ───────────────────────────────────────────────────────

// Parse RFC 4180 CSV text into rows of string cells. Handles quoted fields with
// embedded commas, newlines, and doubled "" quotes (the same shape csvEscape
// produces), so an exported file round-trips. Strips a leading UTF-8 BOM and
// accepts both \r\n and \n line endings. Pure and dependency-free.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; // skip BOM

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        // A doubled "" is an escaped quote; a lone " ends the quoted field.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
    } else if (ch === ",") {
      endField();
      i++;
    } else if (ch === "\n") {
      endRow();
      i++;
    } else if (ch === "\r") {
      i++; // structural CR (part of \r\n); CRs inside quotes are kept above
    } else {
      field += ch;
      i++;
    }
  }
  // Flush a trailing field/row unless the text ended exactly on a newline.
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

// The fields an import row can supply, in no particular order.
export const IMPORT_FIELDS = [
  "date",
  "type",
  "category",
  "note",
  "amount",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

// Map a header row to column indices by name (case-insensitive, trimmed),
// matching the export's TRANSACTION_CSV_COLUMNS. This is the "column mapping":
// because the export is the canonical format, columns are auto-detected by
// header rather than hand-mapped. Note is optional (-1 when absent); the rest
// are required, and any missing ones are returned by their display label.
export function mapCsvColumns(header: string[]): {
  map: Record<ImportField, number>;
  missing: string[];
} {
  const normalized = header.map((h) => h.trim().toLowerCase());
  const map = Object.fromEntries(
    IMPORT_FIELDS.map((f) => [f, normalized.indexOf(f)])
  ) as Record<ImportField, number>;

  const required: Array<[ImportField, string]> = [
    ["date", "Date"],
    ["type", "Type"],
    ["category", "Category"],
    ["amount", "Amount"],
  ];
  const missing = required.filter(([f]) => map[f] === -1).map(([, label]) => label);
  return { map, missing };
}
