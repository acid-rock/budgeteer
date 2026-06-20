import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { monthStringToDate } from "@/lib/utils";
import { serializeBudget } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, NotFoundError } from "@/lib/http";
import { parseWith, budgetCreateSchema } from "@/lib/schemas";

export const GET = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const budgets = await prisma.budget.findMany({
    where: { userId, ...(month ? { month: monthStringToDate(month) } : {}) },
    include: { category: true },
    orderBy: { month: "desc" },
  });
  return NextResponse.json(budgets.map(serializeBudget));
});

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId, month, limit } = parseWith(
    budgetCreateSchema,
    await parseJson(request)
  );
  const monthDate = monthStringToDate(month);

  // Verify ownership and upsert atomically.
  const budget = await prisma.$transaction(async (tx) => {
    const category = await tx.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!category) throw new NotFoundError("Category not found");

    return tx.budget.upsert({
      where: { categoryId_month: { categoryId, month: monthDate } },
      create: { categoryId, month: monthDate, limit, userId },
      update: { limit },
      include: { category: true },
    });
  });
  return NextResponse.json(serializeBudget(budget), { status: 201 });
});
