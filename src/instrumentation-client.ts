// Sentry init for the browser. Next 16 loads this file automatically on the
// client (the successor to the old sentry.client.config.ts). Captures unhandled
// client-side React/runtime errors. Session Replay is intentionally OFF — it can
// record finance data on screen, and we never opt into that.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  // Replay disabled (no session/error capture).
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});

// Lets Sentry tie navigation transitions to errors in the App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
