import { auth } from "@/auth";

// Reads the Auth.js JWT session and returns the current user's DB id.
// Returns null when unauthenticated — callers return 401 when this is null.
// Used in every API route as defence-in-depth on top of the middleware guard.
export async function getRequiredUser(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
