// Next.js instrumentation hook — runs once when a server process starts.
//
// Two jobs: (1) validate environment variables at boot by importing the env
// module, so a missing/blank required var throws a clear error immediately
// instead of failing deep inside the first request; (2) initialize Sentry for the
// active server runtime.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only the Node.js runtime needs (and can fully see) the server env; the edge
    // runtime is intentionally excluded, matching the env module's Node-only scope.
    await import("@/lib/env");
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forwards server-side request errors (including those Next would otherwise only
// surface in its own logs) to Sentry. Note: API routes wrapped in
// withErrorHandling catch their own errors before this fires, so those report via
// Sentry.captureException in src/lib/http.ts instead.
export const onRequestError = Sentry.captureRequestError;
