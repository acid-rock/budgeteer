import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeCategory } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, ConflictError } from "@/lib/http";
import { parseWith, categoryUpdateSchema } from "@/lib/schemas";

export const PATCH = withErrorHandling(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = parseWith(categoryUpdateSchema, await parseJson(request));
  const data: Prisma.CategoryUpdateInput = {};

  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.kind !== undefined) data.kind = parsed.kind;
  // target is nullish: a number sets the goal, null clears it, undefined leaves
  // it untouched (so editing a name/kind doesn't wipe an existing goal).
  if (parsed.target !== undefined) data.target = parsed.target;

  try {
    const category = await prisma.category.update({
      where: { id, userId },
      data,
    });
    return NextResponse.json(serializeCategory(category));
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
});

export const DELETE = withErrorHandling(async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // Count usage and delete in one transaction so a transaction/budget can't
    // start referencing the category between the check and the delete. The FK
    // (onDelete: Restrict) is the ultimate backstop if one slips in.
    await prisma.$transaction(async (tx) => {
      const [txCount, budgetCount] = await Promise.all([
        tx.transaction.count({ where: { categoryId: id, userId } }),
        tx.budget.count({ where: { categoryId: id, userId } }),
      ]);
      if (txCount > 0 || budgetCount > 0) {
        throw new ConflictError(
          `Category is in use by ${txCount} transaction(s) and ${budgetCount} budget(s). Reassign or delete those first.`
        );
      }
      await tx.category.delete({ where: { id, userId } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    throw e;
  }
});
