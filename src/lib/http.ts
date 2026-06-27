import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

// Tagged error for malformed or invalid request bodies. Thrown by `parseJson`
// and caught by `withErrorHandling`, which turns it into a 400. Routes can also
// throw it directly for their own body-shape rejections.
export class BadRequestError extends Error {
  constructor(message = "Invalid request") {
    super(message);
    this.name = "BadRequestError";
  }
}

// Thrown when an entity is missing or not owned by the caller — e.g. a category
// ownership check inside a $transaction. Caught by withErrorHandling → 404.
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

// Thrown for state conflicts — e.g. deleting a category still in use. Caught by
// withErrorHandling → 409.
export class ConflictError extends Error {
  constructor(message = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

// Parse a JSON request body, throwing a BadRequestError (→ 400) on malformed
// JSON instead of letting the raw SyntaxError bubble up to an unhandled 500.
// Defaults to `any` so existing routes keep destructuring the body as before;
// callers may pass a type once schema validation (Phase 2) lands.
export async function parseJson<T = any>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

// Maps an unhandled error to a sanitized JSON response. Known, expected cases
// (bad input, Prisma not-found / unique-conflict) get specific statuses; the
// client never sees a stack trace or internal message. Anything unexpected is
// logged for the platform to capture and returned as a generic 500.
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "That record already exists" },
        { status: 409 }
      );
    }
    // Serializable write-conflict / deadlock — two transactions raced and Postgres
    // aborted this one. The caller can safely retry.
    if (error.code === "P2034") {
      return NextResponse.json(
        { error: "The operation conflicted with another change. Please try again." },
        { status: 409 }
      );
    }
  }

  // withErrorHandling catches route errors here, so Next's onRequestError hook
  // never sees them — report to Sentry explicitly. beforeSend (sentry-scrub)
  // strips any finance data before transmission.
  logger.error("Unhandled API error", error);
  Sentry.captureException(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}

// Wraps a route handler so any thrown error is funneled through handleApiError
// instead of surfacing as a raw 500. Preserves the handler's own signature
// (request, optional context) so Next's route typing still applies. Handlers
// that return early (e.g. a 401) pass straight through untouched.
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
