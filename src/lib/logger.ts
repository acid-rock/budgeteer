// Minimal structured logger — a single seam for error/observability output.
//
// In production it emits one-line JSON so the hosting platform (Vercel) captures
// it in its log drain; in development it stays human-readable. Errors are
// flattened to { name, message, stack } so they survive JSON.stringify (a raw
// Error serializes to "{}"). To send errors to Sentry or another sink later,
// swap the body of `emit` — every call site stays the same.

type Level = "error" | "warn" | "info";

function normalizeMeta(meta: unknown) {
  if (meta instanceof Error) {
    return { name: meta.name, message: meta.message, stack: meta.stack };
  }
  return meta;
}

function emit(level: Level, message: string, meta?: unknown) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(meta !== undefined ? { meta: normalizeMeta(meta) } : {}),
  };

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
