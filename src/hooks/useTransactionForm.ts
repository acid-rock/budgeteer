"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category, Transaction, TransactionType } from "@/types";
import { todayDateString } from "@/lib/utils";
import {
  createTransaction,
  prependTransaction,
  type TransactionsInfiniteData,
} from "@/lib/transactions";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json();
}

// Remembers the category chosen last time so repeat logging is one tap. Scoped
// per kind so income and expense keep separate defaults.
const LAST_CATEGORY_KEY = "budgeteer:lastCategory";

function readLastCategory(type: TransactionType): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`${LAST_CATEGORY_KEY}:${type}`);
  } catch {
    return null;
  }
}

function writeLastCategory(type: TransactionType, categoryId: string) {
  try {
    window.localStorage.setItem(`${LAST_CATEGORY_KEY}:${type}`, categoryId);
  } catch {
    // Ignore storage failures (private mode, quota) — persistence is best-effort.
  }
}

interface Options {
  onSuccess?: (tx: Transaction) => void;
}

// Headless transaction-create form: owns the field state, the categories query,
// and the create mutation (with optimistic insert + cross-view refresh). Both
// the inline form and the Quick-Add modal render their own JSX over this.
export function useTransactionForm({ onSuccess }: Options = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");

  // Income and expense have distinct category sets (Category.kind), so only
  // show the ones matching the selected type.
  const visibleCategories = categories?.filter((c) => c.kind === type) ?? [];

  // Once categories load (and whenever the kind changes), default to the
  // remembered category for that kind — but never clobber an explicit pick.
  // Seeding from localStorage after mount (rather than during render) is what
  // keeps SSR and the first client render in agreement, so the conservative
  // set-state-in-effect rule is intentionally suppressed here.
  useEffect(() => {
    if (!categories || categoryId) return;
    const remembered = readLastCategory(type);
    if (remembered && categories.some((c) => c.id === remembered && c.kind === type)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategoryId(remembered);
    }
  }, [categories, type, categoryId]);

  // When the type switches, clear any selection so we don't keep a category
  // that belongs to the other kind (the effect above then restores its default).
  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategoryId("");
  }

  const mutation = useMutation({
    mutationFn: createTransaction,
    onMutate: async (input) => {
      // Optimistically prepend the new row to the cached ledger so it shows
      // before the round trip. Snapshot first so onError can roll back.
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previous = queryClient.getQueryData<TransactionsInfiniteData>([
        "transactions",
      ]);
      const category = categories?.find((c) => c.id === input.categoryId);
      const optimistic: Transaction = {
        id: `optimistic-${Date.now()}`,
        type: input.type,
        amount: input.amount,
        date: new Date(input.date).toISOString(),
        note: input.note || null,
        categoryId: input.categoryId,
        category,
      };
      queryClient.setQueryData<TransactionsInfiniteData>(
        ["transactions"],
        (old) => prependTransaction(old, optimistic)
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["transactions"], context.previous);
      }
    },
    onSuccess: (tx, input) => {
      writeLastCategory(input.type, input.categoryId);
      // Reset only the per-entry fields; keep type/category/date so logging a
      // run of similar expenses stays fast.
      setAmount("");
      setNote("");
      onSuccess?.(tx);
    },
    onSettled: () => {
      // Reconcile the optimistic row and refresh every view a new entry touches:
      // the client list/report/budget caches plus the server-rendered dashboard.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      router.refresh();
    },
  });

  function submit() {
    const chosenCategory = categoryId || visibleCategories[0]?.id;
    if (!chosenCategory) return;
    mutation.mutate({
      type,
      amount: Number(amount),
      date,
      categoryId: chosenCategory,
      note,
    });
  }

  return {
    visibleCategories,
    type,
    handleTypeChange,
    amount,
    setAmount,
    date,
    setDate,
    categoryId,
    setCategoryId,
    note,
    setNote,
    submit,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as Error | null,
  };
}
