import { z } from "zod";

// Single source of truth for server environment variables. Parsed once at module
// load — and explicitly at server boot via src/instrumentation.ts — so a missing
// or blank required var fails fast with a clear message instead of surfacing as a
// confusing error deep inside a request.
//
// Node-only by design. The codebase keeps an edge-safe boundary (see the
// adapter-free authConfig used by middleware), so this validator is intentionally
// NOT imported from the edge runtime. The required vars are consumed by Prisma
// (DATABASE_URL/DIRECT_URL) and next-auth (AUTH_*) internally; this module's job
// is to validate them up front. The Upstash vars are read directly in
// src/lib/rate-limit.ts (edge) — declared here for validation completeness.

// Optional secret: present-and-non-empty, or absent. A blank string ("", e.g. an
// unfilled .env line) is treated as "not configured" rather than an error.
const optionalSecret = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().min(1).optional()
);

const envSchema = z.object({
  // Database (Neon / Postgres) — pooled + direct connection strings.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),

  // Auth.js session secret + OAuth provider credentials.
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GITHUB_ID: z.string().min(1, "AUTH_GITHUB_ID is required"),
  AUTH_GITHUB_SECRET: z.string().min(1, "AUTH_GITHUB_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),

  // Rate limiting (Upstash Redis) — optional; when unset, rate limiting is
  // disabled and the app still runs.
  UPSTASH_REDIS_REST_URL: optionalSecret,
  UPSTASH_REDIS_REST_TOKEN: optionalSecret,

  // Error sink (optional) — a webhook URL that production error logs are POSTed
  // to. Read directly in src/lib/logger.ts (edge-safe); declared here for
  // validation completeness, like the Upstash vars.
  ERROR_SINK_URL: optionalSecret,

  // Sentry DSN (optional). NEXT_PUBLIC_* so the browser SDK can read it; inlined
  // at build time. When unset the SDK initializes disabled and the app runs
  // normally. The build-time SENTRY_AUTH_TOKEN/ORG/PROJECT (source-map upload)
  // live only in CI and aren't validated here.
  NEXT_PUBLIC_SENTRY_DSN: optionalSecret,
});

export type Env = z.infer<typeof envSchema>;

// Validate an env-like record, throwing one error that lists every problem
// (rather than failing on the first). Unknown keys are stripped, so passing the
// full process.env is fine. Exported for unit testing.
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const details = result.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(value)"}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment configuration:\n${details}\n\n` +
      `Set these before starting the app (see .env.example).`
  );
}

// Parsed once at module load; importing this module (e.g. from instrumentation.ts
// at boot) is what triggers validation.
export const env = parseEnv(process.env);
