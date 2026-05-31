import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";

// GET /api/transactions — list transactions, newest first.
// Optional ?month=YYYY-MM filter could be added later (TODO).
export async function GET() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
    include: { category: true },
  });
  return NextResponse.json(transactions.map(serializeTransaction));
}

// POST /api/transactions — create a transaction.
// Body: { type, amount, date?, categoryId, note? }
export async function POST(request: Request) {
  const body = await request.json();
  const { type, amount, date, categoryId, note } = body;

  // Minimal validation — expand as needed.
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
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      amount: numericAmount,
      date: date ? new Date(date) : new Date(),
      categoryId,
      note: note || null,
    },
    include: { category: true },
  });
  return NextResponse.json(serializeTransaction(transaction), { status: 201 });
}
