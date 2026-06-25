import { z } from "zod";
import { BadRequestError } from "@/lib/http";

// Per-route input schemas. These fold the previously hand-rolled numeric/enum
// checks into one place and add the hardening the review called for: valid-date
// parsing (rejecting `new Date("garbage")`) and max lengths on free text.
// Messages mirror the old wording so error shapes stay stable.

const positiveAmount = z.coerce
  .number()
  .refine((n) => Number.isFinite(n) && n > 0, "amount must be a positive number");

const nonNegativeLimit = z.coerce
  .number()
  .refine((n) => Number.isFinite(n) && n >= 0, "limit must be a non-negative number");

// Free-text note: trimmed, capped, and null/undefined both allowed.
const note = z
  .string()
  .trim()
  .max(500, "note must be 500 characters or fewer")
  .nullish();

const categoryName = z
  .string()
  .trim()
  .min(1, "name is required")
  .max(80, "name must be 80 characters or fewer");

export const transactionCreateSchema = z.object({
  type: z.enum(["income", "expense"], {
    error: "type must be 'income' or 'expense'",
  }),
  amount: positiveAmount,
  // Accepts ISO dates and date-only strings; rejects unparseable values.
  date: z.coerce.date({ error: "date must be a valid date" }).optional(),
  categoryId: z
    .string({ error: "categoryId is required" })
    .min(1, "categoryId is required"),
  note,
});

export const transactionUpdateSchema = z.object({
  type: z
    .enum(["income", "expense"], { error: "type must be 'income' or 'expense'" })
    .optional(),
  amount: positiveAmount.optional(),
  date: z.coerce.date({ error: "date must be a valid date" }).optional(),
  categoryId: z
    .string()
    .min(1, "categoryId must be a non-empty string")
    .optional(),
  note,
});

export const categoryCreateSchema = z.object({
  name: categoryName,
  // Matches the original lenient POST behavior: anything that isn't a known kind
  // (including a missing/unknown value) falls back to "expense". The PATCH schema
  // below is strict and rejects unknown kinds instead.
  kind: z.enum(["income", "expense", "savings"]).catch("expense"),
  // Optional savings goal; only meaningful for kind "savings". null clears it.
  target: nonNegativeLimit.nullish(),
});

export const categoryUpdateSchema = z.object({
  name: categoryName.optional(),
  kind: z
    .enum(["income", "expense", "savings"], {
      error: "kind must be 'income', 'expense', or 'savings'",
    })
    .optional(),
  target: nonNegativeLimit.nullish(),
});

// A savings deposit/withdraw against a kind="savings" bucket. Reuses the same
// positive-amount and note helpers as a regular transaction.
export const savingsMovementCreateSchema = z.object({
  type: z.enum(["deposit", "withdraw"], {
    error: "type must be 'deposit' or 'withdraw'",
  }),
  amount: positiveAmount,
  date: z.coerce.date({ error: "date must be a valid date" }).optional(),
  categoryId: z
    .string({ error: "categoryId is required" })
    .min(1, "categoryId is required"),
  note,
});

export const budgetCreateSchema = z.object({
  categoryId: z
    .string({ error: "categoryId and month are required" })
    .min(1, "categoryId and month are required"),
  month: z
    .string({ error: "categoryId and month are required" })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format"),
  limit: nonNegativeLimit,
});

export const budgetUpdateSchema = z.object({
  limit: nonNegativeLimit,
});

// Bulk upsert of budgets for one month (Auto-budget "Apply selected"). Each item
// reuses the same non-negative limit as a single budget; an empty list is allowed
// (the user may deselect everything) and simply writes nothing.
export const budgetBulkSchema = z.object({
  month: z
    .string({ error: "month is required" })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format"),
  items: z.array(
    z.object({
      categoryId: z.string().min(1, "categoryId is required"),
      limit: nonNegativeLimit,
    })
  ),
});

// Validate `data` against `schema`, throwing a BadRequestError (→ 400 via
// withErrorHandling) carrying the first issue's message on failure.
export function parseWith<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestError(result.error.issues[0]?.message ?? "Invalid request");
  }
  return result.data;
}
