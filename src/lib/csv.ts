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
