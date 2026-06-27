import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

// Static security headers. The Content-Security-Policy is NOT here — it's set
// per-request in src/middleware.ts so it can carry a fresh nonce (allowing Next's
// inline bootstrap scripts without 'unsafe-inline'). See src/lib/csp.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only assert HSTS in production — never on http://localhost.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Wrap with Sentry. This injects the SDK and, when SENTRY_AUTH_TOKEN is present
// (CI), uploads source maps so stack traces de-minify; with no token it skips
// upload gracefully and the build still succeeds.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Quiet locally; verbose in CI so a failed/skip source-map upload is visible.
  silent: !process.env.CI,
  // Route browser events through a same-origin path so the strict CSP
  // (connect-src 'self') doesn't block them and ad-blockers don't drop them.
  // This route is excluded from the auth middleware (see src/middleware.ts).
  tunnelRoute: "/monitoring",
  // Tree-shake Sentry's own debug logging out of the client bundle.
  disableLogger: true,
});
