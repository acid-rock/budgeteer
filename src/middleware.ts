import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ratelimit } from "@/lib/rate-limit";
import { buildCsp } from "@/lib/csp";

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

  // Per-request CSP nonce. Setting the CSP (with the nonce) on the *request*
  // headers is what lets Next stamp the nonce onto its inline bootstrap scripts;
  // setting it on the *response* is what makes the browser enforce the policy.
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Throttle the API per IP before any handler or DB work runs. No-ops when
  // Upstash isn't configured.
  if (ratelimit && pathname.startsWith("/api/")) {
    const { success, limit, remaining, reset } = await ratelimit.limit(
      clientIp(req)
    );
    if (!success) {
      const res = NextResponse.json(
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
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }
  }

  // Unauthenticated requests to protected routes go to /login. /login itself is
  // public — it's matched only so it receives the CSP header (no redirect).
  if (pathname !== "/login" && !req.auth?.user) {
    const res = NextResponse.redirect(new URL("/login", req.nextUrl.origin));
    res.headers.set("Content-Security-Policy", csp);
    return res;
  }

  // Continue. Forward the nonce so Next can stamp it on its inline scripts, and
  // set the enforcing CSP on the response.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
});

export const config = {
  // Run on all routes except:
  //  - Next.js internals (_next/*)
  //  - Auth.js callback routes (api/auth/*)
  //  - The public health probe (api/health)
  //  - favicon / app icon (static metadata)
  //  - PWA assets that must be publicly fetchable (manifest, SW, offline, *.png)
  // NOTE: /login IS matched (unlike before) so it gets the CSP header; the auth
  // redirect is skipped for it in the handler above.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline.html|.*\\.png|api/auth|api/health).*)",
  ],
};
