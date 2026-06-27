// Finance-data scrubbing for Sentry. Budgeteer handles money: amounts, notes,
// and account emails must never leave the app inside an error report. Two layers:
//
//  • `redactSensitive` — walks an arbitrary value and replaces the VALUE of any
//    key whose name looks sensitive (amount/balance/note/email/token/…) with
//    "[redacted]", recursively. Keys like userId/categoryId/count pass through so
//    events stay useful for debugging.
//  • `scrubEvent` — the Sentry `beforeSend` hook. Drops request bodies/cookies and
//    user email/IP wholesale, then runs `redactSensitive` over the free-form
//    `extra`/`contexts` bags.
//
// Pure and dependency-free at runtime (the Sentry types are erased `import type`),
// so it's edge-safe and cheap to unit test, and the logger can reuse
// `redactSensitive` for its own meta without pulling in the SDK.

import type { ErrorEvent } from "@sentry/nextjs";

// Key names whose values may carry money or personal data. Matched
// case-insensitively as a substring, so `unitAmount` and `customerEmail` are
// covered too.
const SENSITIVE_KEY =
  /amount|balance|price|note|email|token|secret|password|cookie|authorization/i;

const REDACTED = "[redacted]";
const MAX_DEPTH = 6;

// Replace sensitive values in-place by key name. Strings/numbers are returned
// as-is (we redact by key, not by scanning every primitive — a free-floating
// number isn't necessarily money). The depth cap guards against cyclic or
// pathologically nested objects.
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value == null || depth > MAX_DEPTH) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redactSensitive(v, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactSensitive(val, depth + 1);
    }
    return out;
  }

  return value;
}

// Sentry `beforeSend`: last line of defense before an event is transmitted.
// Returning the (mutated) event keeps it; returning null would drop it.
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    // Request bodies and cookies are the most likely place for raw amounts/notes
    // and the session token — never send them.
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.authorization;
    }
  }

  if (event.user) {
    // Keep the user id (useful, opaque); drop anything identifying.
    delete event.user.email;
    delete event.user.username;
    delete event.user.ip_address;
  }

  if (event.extra) event.extra = redactSensitive(event.extra) as ErrorEvent["extra"];
  if (event.contexts)
    event.contexts = redactSensitive(event.contexts) as ErrorEvent["contexts"];

  return event;
}
