import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeBudget } from "@/lib/serialize";
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

  const numericLimit = Number(body.limit);
  if (!Number.isFinite(numericLimit) || numericLimit < 0) {
    return NextResponse.json(
      { error: "limit must be a non-negative number" },
      { status: 400 }
    );
  }

  try {
    const budget = await prisma.budget.update({
      where: { id, userId },
      data: { limit: numericLimit },
      include: { category: true },
    });
    return NextResponse.json(serializeBudget(budget));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
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
    await prisma.budget.delete({ where: { id, userId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }
    throw e;
  }
});
