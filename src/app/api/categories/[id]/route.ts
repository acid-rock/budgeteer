import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getRequiredUser } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const data: Prisma.CategoryUpdateInput = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.kind !== undefined) {
    if (body.kind !== "income" && body.kind !== "expense") {
      return NextResponse.json(
        { error: "kind must be 'income' or 'expense'" },
        { status: 400 }
      );
    }
    data.kind = body.kind;
  }

  try {
    const category = await prisma.category.update({
      where: { id, userId },
      data,
    });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "You already have a category with that name and kind" },
          { status: 409 }
        );
      }
    }
    throw e;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Count usage scoped to this user's data only.
  const [txCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id, userId } }),
    prisma.budget.count({ where: { categoryId: id, userId } }),
  ]);
  if (txCount > 0 || budgetCount > 0) {
    return NextResponse.json(
      {
        error: `Category is in use by ${txCount} transaction(s) and ${budgetCount} budget(s). Reassign or delete those first.`,
      },
      { status: 409 }
    );
  }

  try {
    await prisma.category.delete({ where: { id, userId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    throw e;
  }
}
