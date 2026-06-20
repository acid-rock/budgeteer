import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling } from "@/lib/http";

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

  const body = await parseJson(request);
  const { type, amount, date, categoryId, note } = body;

  if (type !== "income" && type !== "expense") {
    return NextResponse.json(
      { error: "type must be 'income' or 'expense'" },
      { status: 400 }
    );
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 }
    );
  }
  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  // Verify the category belongs to this user before linking it.
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount: numericAmount,
      date: date ? new Date(date) : new Date(),
      categoryId,
      note: note || null,
      userId,
    },
    include: { category: true },
  });
  return NextResponse.json(serializeTransaction(transaction), { status: 201 });
});
