import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, NotFoundError } from "@/lib/http";
import { parseWith, transactionCreateSchema } from "@/lib/schemas";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const GET = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const cursor = searchParams.get("cursor");

  // Cursor pagination: fetch one extra row to detect whether more remain. The
  // id tiebreaker keeps ordering stable across days that share a date.
  const rows = await prisma.transaction.findMany({
    where: { userId },
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
    transactionCreateSchema,
    await parseJson(request)
  );

  // Verify category ownership and create in one transaction so the category
  // can't be deleted out from under us between the check and the insert.
  const transaction = await prisma.$transaction(async (tx) => {
    const category = await tx.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) throw new NotFoundError("Category not found");

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
  return NextResponse.json(serializeTransaction(transaction), { status: 201 });
});
