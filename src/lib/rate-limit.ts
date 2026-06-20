import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-IP sliding-window limit applied to /api/* in middleware. Generous enough
// for normal SPA traffic (TanStack Query caches responses, so a session makes
// few calls) while still capping sustained hammering. Tune here.
const MAX_REQUESTS = 100;
const WINDOW = "60 s" as const;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Null when Upstash isn't configured (local dev, CI, or a build without the env
// vars). The middleware treats a null limiter as "rate limiting disabled" so the
// app still runs everywhere — it only activates once the env vars are present.
export const ratelimit =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
        prefix: "budgeteer:rl",
        analytics: false,
      })
    : null;
