// Sentry init for the edge runtime (middleware + edge routes). Loaded from
// src/instrumentation.ts `register()` when NEXT_RUNTIME === "edge". Mirrors the
// server config; scrubEvent is pure and edge-safe.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
