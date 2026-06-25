import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serializeCategory } from "@/lib/serialize";
import { getRequiredUser } from "@/lib/session";
import { parseJson, withErrorHandling } from "@/lib/http";
import { parseWith, categoryCreateSchema } from "@/lib/schemas";

export const GET = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories.map(serializeCategory));
});

export const POST = withErrorHandling(async (request: Request) => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, kind, target } = parseWith(
    categoryCreateSchema,
    await parseJson(request)
  );

  try {
    const category = await prisma.category.create({
      // target only applies to savings buckets; null for income/expense.
      data: { name, kind, target: kind === "savings" ? target ?? null : null, userId },
    });
    return NextResponse.json(serializeCategory(category), { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: `You already have a ${kind} category named "${name}"` },
        { status: 409 }
      );
    }
    throw e;
  }
});
