import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge-safe route guard. Uses the edge-safe authConfig (no Prisma/DB adapter)
// so it runs in the edge runtime without importing Node-only modules.
// The authorized() callback in authConfig returns false → redirects to /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect everything except:
  //  - Next.js internals (_next/*)
  //  - The login page itself
  //  - Auth.js callback routes (api/auth/*)
  //  - favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)"],
};
