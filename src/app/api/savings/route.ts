import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";
import { getSavingsSummary } from "@/lib/savings-data";

// Per-bucket balances + total saved. getSavingsSummary already returns plain
// numbers (Decimals converted), so the payload is JSON-safe as-is.
export const GET = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getSavingsSummary(userId));
});
