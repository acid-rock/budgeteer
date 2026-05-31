import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { monthStringToDate } from "@/lib/utils";

// GET /api/budgets?month=YYYY-MM — list budgets, optionally filtered by month.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const budgets = await prisma.budget.findMany({
    where: month ? { month: monthStringToDate(month) } : undefined,
    include: { category: true },
    orderBy: { month: "desc" },
  });
  return NextResponse.json(budgets);
}

// POST /api/budgets — upsert a budget for a category + month (create or update).
// Body: { categoryId, month: "YYYY-MM", limit }
// By-id update/delete live in ./[id]/route.ts.
export async function POST(request: Request) {
  const body = await request.json();
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

  const monthDate = monthStringToDate(month);
  const budget = await prisma.budget.upsert({
    where: { categoryId_month: { categoryId, month: monthDate } },
    create: { categoryId, month: monthDate, limit: numericLimit },
    update: { limit: numericLimit },
    include: { category: true },
  });
  return NextResponse.json(budget, { status: 201 });
}
