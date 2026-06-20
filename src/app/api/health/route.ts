import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public health probe for load balancers / uptime checks — excluded from the
// auth middleware. Pings the database so it doubles as a readiness check:
// returns 200 when reachable, 503 when not.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable" },
      { status: 503 }
    );
  }
}
