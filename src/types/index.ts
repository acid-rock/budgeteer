// App-wide shared types. The DB row shapes come from Prisma's generated client;
// these are the serialized/DTO shapes used across API boundaries and the UI.

export type TransactionType = "income" | "expense";
export type CategoryKind = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO string over the wire
  note: string | null;
  categoryId: string;
  category?: Category;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: string; // "YYYY-MM"
  limit: number;
}

// Shape returned by the monthly report endpoint.
export interface CategoryReportRow {
  categoryId: string;
  categoryName: string;
  spent: number;
  limit: number | null;
}

export interface MonthlyReport {
  month: string; // "YYYY-MM"
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  byCategory: CategoryReportRow[];
}
