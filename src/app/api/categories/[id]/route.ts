import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// PATCH /api/categories/:id — rename or change kind. Body: { name?, kind? }.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "A category with that name and kind already exists" },
          { status: 409 }
        );
      }
    }
    throw e;
  }
}

// DELETE /api/categories/:id — remove a category, but only if nothing uses it.
// Categories are referenced by transactions and budgets; deleting one in use
// would orphan/break those rows, so we block it with a clear message instead.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [txCount, budgetCount] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.budget.count({ where: { categoryId: id } }),
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
    await prisma.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }
    throw e;
  }
}
