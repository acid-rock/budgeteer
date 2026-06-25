import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import {
  parseJson,
  withErrorHandling,
  NotFoundError,
  BadRequestError,
} from "@/lib/http";
import { parseWith, savingsMovementCreateSchema } from "@/lib/schemas";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Cursor-paginated movement history, filtered to deposits/withdrawals so it can
// never surface ledger transactions. Mirrors GET /api/transactions; an optional
// ?categoryId scopes the list to one bucket.
export const GET = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = searchParams.get("cursor");
  const categoryId = searchParams.get("categoryId");

  const rows = await prisma.transaction.findMany({
    where: {
      userId,
      type: { in: ["deposit", "withdraw"] },
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { category: true },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(serializeTransaction);
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return NextResponse.json({ items, nextCursor });
});

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, amount, date, categoryId, note } = parseWith(
    savingsMovementCreateSchema,
    await parseJson(request)
  );

  // Verify the bucket is owned AND is a savings bucket, and (for withdrawals)
  // that there's enough balance — all in one transaction so the balance can't
  // shift between the check and the insert.
  const movement = await prisma.$transaction(async (tx) => {
    const bucket = await tx.category.findFirst({
      where: { id: categoryId, userId, kind: "savings" },
    });
    if (!bucket) throw new NotFoundError("Savings bucket not found");

    if (type === "withdraw") {
      const sums = await tx.transaction.groupBy({
        by: ["type"],
        where: { userId, categoryId, type: { in: ["deposit", "withdraw"] } },
        _sum: { amount: true },
      });
      const sumFor = (t: string) =>
        Number(sums.find((s) => s.type === t)?._sum.amount ?? 0);
      const balance = sumFor("deposit") - sumFor("withdraw");
      if (amount > balance) {
        throw new BadRequestError(
          `Cannot withdraw more than the bucket balance (${formatCurrency(balance)})`
        );
      }
    }

    return tx.transaction.create({
      data: {
        type,
        amount,
        date: date ?? new Date(),
        categoryId,
        note: note || null,
        userId,
      },
      include: { category: true },
    });
  });
  return NextResponse.json(serializeTransaction(movement), { status: 201 });
});
