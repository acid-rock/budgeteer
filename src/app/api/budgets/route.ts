import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { monthStringToDate } from "@/lib/utils";
import { serializeBudget } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling } from "@/lib/http";

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

  const body = await parseJson(request);
  const { categoryId, month, limit } = body;

  if (!categoryId || !month) {
    return NextResponse.json(
      { error: "categoryId and month are required" },
      { status: 400 }
    );
  }
  const numericLimit = Number(limit);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) {
    return NextResponse.json(
      { error: "limit must be a non-negative number" },
      { status: 400 }
    );
  }

  // Verify the category belongs to this user.
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const monthDate = monthStringToDate(month);
  const budget = await prisma.budget.upsert({
    where: { categoryId_month: { categoryId, month: monthDate } },
    create: { categoryId, month: monthDate, limit: numericLimit, userId },
    update: { limit: numericLimit },
    include: { category: true },
  });
  return NextResponse.json(serializeBudget(budget), { status: 201 });
});
