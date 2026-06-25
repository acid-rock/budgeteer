// App-wide shared types. The DB row shapes come from Prisma's generated client;
// these are the serialized/DTO shapes used across API boundaries and the UI.

export type TransactionType = "income" | "expense";
export type CategoryKind = "income" | "expense" | "savings";

// Savings movements are transfers against a kind="savings" bucket, kept off the
// income/expense ledger entirely.
export type SavingsMovementType = "deposit" | "withdraw";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  // Optional savings goal; only set when kind === "savings".
  target?: number | null;
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

// One Auto-budget suggestion row: a category's rolling-average suggested limit
// alongside whatever limit (if any) it already has for the target month.
export interface BudgetSuggestion {
  categoryId: string;
  categoryName: string;
  suggested: number;
  existingLimit: number | null;
}

// One deposit/withdraw movement against a savings bucket (a Transaction whose
// type is "deposit" | "withdraw"). Mirrors Transaction over the wire.
export interface SavingsMovement {
  id: string;
  type: SavingsMovementType;
  amount: number;
  date: string; // ISO string over the wire
  note: string | null;
  categoryId: string;
  category?: Category;
}

// Per-bucket running balance (deposited − withdrawn), with optional goal.
export interface SavingsBucket {
  categoryId: string;
  name: string;
  balance: number;
  deposited: number;
  withdrawn: number;
  target: number | null;
}

export interface SavingsSummary {
  totalSaved: number;
  buckets: SavingsBucket[];
}
