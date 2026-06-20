import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling } from "@/lib/http";

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await parseJson(request);
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
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.note !== undefined) data.note = body.note || null;
  if (body.categoryId !== undefined) {
    if (!body.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json(
        { error: "categoryId must be a non-empty string" },
        { status: 400 }
      );
    }
    // Verify the new category belongs to this user.
    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, userId },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    data.category = { connect: { id: body.categoryId } };
  }

  try {
    // where: { id, userId } enforces ownership at the DB level.
    const transaction = await prisma.transaction.update({
      where: { id, userId },
      data,
      include: { category: true },
    });
    return NextResponse.json(serializeTransaction(transaction));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    throw e;
  }
});

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.transaction.delete({ where: { id, userId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    throw e;
  }
});
