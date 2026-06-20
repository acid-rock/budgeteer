import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, NotFoundError } from "@/lib/http";
import { parseWith, transactionUpdateSchema } from "@/lib/schemas";

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = parseWith(transactionUpdateSchema, await parseJson(request));
  const data: Prisma.TransactionUpdateInput = {};

  if (parsed.type !== undefined) data.type = parsed.type;
  if (parsed.amount !== undefined) data.amount = parsed.amount;
  if (parsed.date !== undefined) data.date = parsed.date;
  if (parsed.note !== undefined) data.note = parsed.note || null;

  try {
    // Verify a new category (if any) and apply the update atomically.
    // where: { id, userId } enforces transaction ownership at the DB level.
    const transaction = await prisma.$transaction(async (tx) => {
      if (parsed.categoryId !== undefined) {
        const category = await tx.category.findFirst({
          where: { id: parsed.categoryId, userId },
        });
        if (!category) throw new NotFoundError("Category not found");
        data.category = { connect: { id: parsed.categoryId } };
      }
      return tx.transaction.update({
        where: { id, userId },
        data,
        include: { category: true },
      });
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
