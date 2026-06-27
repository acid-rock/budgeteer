import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getRequiredUser } from "@/lib/session";
import { withErrorHandling } from "@/lib/http";
import { logger } from "@/lib/logger";

// Auth.js (JWT strategy) session cookie names. The __Secure- prefixed variant is
// used over HTTPS in production; the bare name in local http dev. We clear both
// so a deleted user's still-valid JWT can't be replayed after deletion.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

// DELETE /api/account — permanently delete the authenticated user and all their
// data, then clear their session.
//
// User relations (accounts, sessions) are onDelete: Cascade, so deleting the User
// removes them. But Transaction.categoryId and Budget.categoryId are onDelete:
// Restrict (so a category in use can't be deleted) — and Postgres enforces
// RESTRICT immediately, so a bare `user.delete` cascade could try to remove a
// Category while its transactions/budgets still reference it. We therefore delete
// the Restrict-protected children first, in dependency order, inside one
// transaction so the whole thing is atomic.
export const DELETE = withErrorHandling(async () => {
  const userId = await getRequiredUser();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.category.deleteMany({ where: { userId } }),
    // Cascades the remaining relations (OAuth accounts, sessions).
    prisma.user.delete({ where: { id: userId } }),
  ]);

  logger.info("account deleted", { userId });

  // Invalidate the session so the now-orphaned JWT is dead immediately.
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIES) cookieStore.delete(name);

  return NextResponse.json({ ok: true });
});
