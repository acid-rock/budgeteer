// Minimal structured logger — a single seam for error/observability output.
//
// In production it emits one-line JSON so the hosting platform (Vercel) captures
// it in its log drain; in development it stays human-readable. Errors are
// flattened to { name, message, stack } so they survive JSON.stringify (a raw
// Error serializes to "{}").
//
// Error sink: in production, if ERROR_SINK_URL is set, every error-level entry is
// also POSTed to that URL (fire-and-forget) so unhandled server errors reach an
// external service — Sentry's "Internal" / generic ingestion, Better Stack, a
// Slack/Discord webhook, etc. This is the single integration point; nothing else
// in the codebase changes. Read from process.env directly (not @/lib/env) so the
// logger stays usable from the edge runtime, matching rate-limit.ts.

import { redactSensitive } from "@/lib/sentry-scrub";

type Level = "error" | "warn" | "info";

interface LogEntry {
  level: Level;
  message: string;
  time: string;
  meta?: unknown;
}

function normalizeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  // Redact finance/PII values by key, matching the Sentry scrubbing — so meta
  // that reaches the ERROR_SINK_URL webhook (or local logs) carries no amounts,
  // notes, or emails.
  return redactSensitive(meta);
}

// Forward an error entry to the external sink, if one is configured in
// production. Fire-and-forget: it never awaits (so it can't slow a response),
// never throws, and never recurses back into the logger on failure (which would
// loop). `keepalive` lets the request finish even if the serverless invocation
// is torn down right after.
function forwardToSink(entry: LogEntry) {
  const url = process.env.ERROR_SINK_URL;
  if (!url || process.env.NODE_ENV !== "production") return;
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Synchronous failures (e.g. fetch unavailable) are swallowed too — logging
    // must never break the request it's reporting on.
  }
}

function emit(level: Level, message: string, meta?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta !== undefined ? { meta: normalizeMeta(meta) } : {}),
  };

  if (level === "error") forwardToSink(entry);

  // Structured JSON in prod for log ingestion; readable objects in dev.
  const payload = process.env.NODE_ENV === "production" ? JSON.stringify(entry) : entry;

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export const logger = {
  error: (message: string, meta?: unknown) => emit("error", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
};
