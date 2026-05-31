import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/categories — list all categories.
export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(categories);
}

// POST /api/categories — create a category. Body: { name, kind }.
export async function POST(request: Request) {
  const body = await request.json();
  const { name, kind } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { name, kind: kind === "income" ? "income" : "expense" },
  });
  return NextResponse.json(category, { status: 201 });
}
