import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// PATCH /api/transactions/:id — update a transaction.
// Body may contain any of: { type, amount, date, categoryId, note }.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const data: Prisma.TransactionUpdateInput = {};

  if (body.type !== undefined) {
    if (body.type !== "income" && body.type !== "expense") {
      return NextResponse.json(
        { error: "type must be 'income' or 'expense'" },
        { status: 400 }
      );
    }
    data.type = body.type;
  }

  if (body.amount !== undefined) {
    const numericAmount = Number(body.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }
    data.amount = numericAmount;
  }

  if (body.date !== undefined) {
    data.date = new Date(body.date);
  }

  if (body.note !== undefined) {
    data.note = body.note || null;
  }

  if (body.categoryId !== undefined) {
    if (!body.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json(
        { error: "categoryId must be a non-empty string" },
        { status: 400 }
      );
    }
    data.category = { connect: { id: body.categoryId } };
  }

  try {
    const transaction = await prisma.transaction.update({
      where: { id },
      data,
      include: { category: true },
    });
    return NextResponse.json(transaction);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    throw e;
  }
}

// DELETE /api/transactions/:id — remove a transaction.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.transaction.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }
    throw e;
  }
}
