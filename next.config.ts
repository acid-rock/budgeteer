import type { NextConfig } from "next";

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

export default nextConfig;
