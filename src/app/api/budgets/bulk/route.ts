import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { monthStringToDate } from "@/lib/utils";
import { serializeBudget } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling, NotFoundError } from "@/lib/http";
import { parseWith, budgetBulkSchema } from "@/lib/schemas";

// POST /api/budgets/bulk { month, items: [{ categoryId, limit }] }
// Applies the Auto-budget preview: verifies every category is owned, then upserts
// each budget for the month — all in one transaction so a partial apply can't
// leave some categories written and others not. Mirrors the single-budget upsert
// in POST /api/budgets.
export const POST = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { month, items } = parseWith(budgetBulkSchema, await parseJson(request));
  const monthDate = monthStringToDate(month);

  const budgets = await prisma.$transaction(async (tx) => {
    // Confirm every targeted category belongs to this user before writing any.
    const ids = items.map((i) => i.categoryId);
    const owned = await tx.category.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    if (owned.length !== new Set(ids).size) {
      throw new NotFoundError("One or more categories not found");
    }

    return Promise.all(
      items.map((item) =>
        tx.budget.upsert({
          where: {
            categoryId_month: { categoryId: item.categoryId, month: monthDate },
          },
          create: {
            categoryId: item.categoryId,
            month: monthDate,
            limit: item.limit,
            userId,
          },
          update: { limit: item.limit },
          include: { category: true },
        })
      )
    );
  });

  return NextResponse.json(budgets.map(serializeBudget), { status: 201 });
});
