import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// PATCH /api/budgets/:id — update a budget's limit.
// Body: { limit }
// (Creating / setting a budget by category+month is handled by POST /api/budgets,
//  which upserts. This is the by-id update for an existing budget.)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const numericLimit = Number(body.limit);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) {
    return NextResponse.json(
      { error: "limit must be a non-negative number" },
      { status: 400 }
    );
  }

  try {
    const budget = await prisma.budget.update({
      where: { id },
      data: { limit: numericLimit },
      include: { category: true },
    });
    return NextResponse.json(budget);
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }
    throw e;
  }
}

// DELETE /api/budgets/:id — remove a budget.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.budget.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }
    throw e;
  }
}
