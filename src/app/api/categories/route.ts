import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// GET /api/categories — list all categories.
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
}

// POST /api/categories — create a category. Body: { name, kind }.
export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const kind = body.kind === "income" ? "income" : "expense";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const category = await prisma.category.create({ data: { name, kind } });
    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: `A ${kind} category named "${name}" already exists` },
        { status: 409 }
      );
    }
    throw e;
  }
}
