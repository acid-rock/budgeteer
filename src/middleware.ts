import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ratelimit } from "@/lib/rate-limit";

// Edge-safe route guard. Uses the edge-safe authConfig (no Prisma/DB adapter)
// so it runs in the edge runtime without importing Node-only modules.
const { auth } = NextAuth(authConfig);

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Throttle the API per IP before any handler or DB work runs. /api/auth is
  // already excluded by the matcher. No-ops when Upstash isn't configured.
  if (ratelimit && pathname.startsWith("/api/")) {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      clientIp(req)
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
            "Retry-After": String(
              Math.max(0, Math.ceil((reset - Date.now()) / 1000))
            ),
          },
        }
      );
    }
  }

  // Preserve the previous guard (formerly the authorized() callback):
  // unauthenticated requests to protected routes are sent to /login.
  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  // Authenticated and within limits → continue.
});

export const config = {
  // Protect everything except:
  //  - Next.js internals (_next/*)
  //  - The login page itself
  //  - Auth.js callback routes (api/auth/*)
  //  - The public health probe (api/health)
  //  - favicon / app icon (static metadata)
  //  - PWA assets that must be publicly fetchable: the manifest, service worker,
  //    offline shell, and home-screen icons (any *.png)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline.html|.*\\.png|login|api/auth|api/health).*)",
  ],
};
