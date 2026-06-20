import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, NotFoundError } from "@/lib/http";
import { parseWith, transactionCreateSchema } from "@/lib/schemas";

export const GET = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });
  return NextResponse.json(transactions.map(serializeTransaction));
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
