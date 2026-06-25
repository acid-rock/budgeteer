import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";
import { todayDateString } from "@/lib/utils";
import {
  toCsvRow,
  transactionCsvFields,
  TRANSACTION_CSV_COLUMNS,
} from "@/lib/csv";

// GET /api/transactions/export — streams the authenticated user's full ledger as
// a CSV download. Savings deposits/withdrawals (transfers) are excluded, matching
// GET /api/transactions. Streamed row-by-row so memory stays flat for large
// ledgers; amounts are serialized to plain numbers via Number() like elsewhere.
export const GET = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.transaction.findMany({
    where: { userId, type: { in: ["income", "expense"] } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { category: true },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // UTF-8 BOM so Excel reads peso signs / unicode notes correctly.
      controller.enqueue(encoder.encode("﻿"));
      controller.enqueue(
        encoder.encode(toCsvRow([...TRANSACTION_CSV_COLUMNS]) + "\r\n")
      );
      for (const t of rows) {
        const line = toCsvRow(
          transactionCsvFields({
            date: t.date.toISOString().slice(0, 10),
            type: t.type,
            categoryName: t.category?.name ?? "",
            note: t.note,
            amount: Number(t.amount),
          })
        );
        controller.enqueue(encoder.encode(line + "\r\n"));
      }
      controller.close();
    },
  });

  const filename = `budgeteer-transactions-${todayDateString()}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
