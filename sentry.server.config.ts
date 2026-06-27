// Sentry init for the Node.js server runtime. Loaded from src/instrumentation.ts
// `register()` when NEXT_RUNTIME === "nodejs". When NEXT_PUBLIC_SENTRY_DSN is
// unset (local/dev or an unconfigured deploy) the SDK initializes disabled and
// no events are sent — the app runs normally.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  // Performance tracing off — this is error monitoring, not APM. Keeps quota and
  // overhead at zero. Raise deliberately if you later want transaction sampling.
  tracesSampleRate: 0,
  // Never attach IPs, cookies, or request bodies automatically; scrubEvent is the
  // belt-and-braces pass for anything that slips through.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
