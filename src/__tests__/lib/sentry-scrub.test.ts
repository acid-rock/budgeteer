import { describe, it, expect } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { redactSensitive, scrubEvent } from "@/lib/sentry-scrub";

describe("redactSensitive", () => {
  it("redacts values of sensitive keys", () => {
    const out = redactSensitive({ amount: 42, note: "rent", balance: 1000 });
    expect(out).toEqual({
      amount: "[redacted]",
      note: "[redacted]",
      balance: "[redacted]",
    });
  });

  it("matches sensitive keys case-insensitively as a substring", () => {
    const out = redactSensitive({
      unitAmount: 5,
      customerEmail: "a@b.com",
      AUTHORIZATION: "Bearer x",
    });
    expect(out).toEqual({
      unitAmount: "[redacted]",
      customerEmail: "[redacted]",
      AUTHORIZATION: "[redacted]",
    });
  });

  it("preserves non-sensitive keys (ids, counts) and their values", () => {
    const out = redactSensitive({ userId: "u1", categoryId: "c1", count: 3 });
    expect(out).toEqual({ userId: "u1", categoryId: "c1", count: 3 });
  });

  it("recurses into nested objects and arrays", () => {
    const out = redactSensitive({
      tx: [{ id: "t1", amount: 10 }, { id: "t2", amount: 20 }],
      user: { id: "u1", email: "x@y.com" },
    });
    expect(out).toEqual({
      tx: [
        { id: "t1", amount: "[redacted]" },
        { id: "t2", amount: "[redacted]" },
      ],
      user: { id: "u1", email: "[redacted]" },
    });
  });

  it("passes primitives and null/undefined through unchanged", () => {
    expect(redactSensitive(5)).toBe(5);
    expect(redactSensitive("hello")).toBe("hello");
    expect(redactSensitive(null)).toBe(null);
    expect(redactSensitive(undefined)).toBe(undefined);
  });
});

describe("scrubEvent", () => {
  it("drops request body, cookies, and sensitive headers", () => {
    const event = {
      request: {
        data: { amount: 99, note: "secret note" },
        cookies: { "authjs.session-token": "abc" },
        headers: { cookie: "x=1", authorization: "Bearer t", "user-agent": "UA" },
      },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.request?.data).toBeUndefined();
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toEqual({ "user-agent": "UA" });
  });

  it("drops user email/username/ip but keeps the id", () => {
    const event = {
      user: { id: "u1", email: "x@y.com", username: "x", ip_address: "1.2.3.4" },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.user).toEqual({ id: "u1" });
  });

  it("redacts sensitive values nested in extra and contexts", () => {
    const event = {
      extra: { amount: 50, route: "/api/transactions" },
      contexts: { tx: { id: "t1", note: "rent" } },
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);

    expect(out.extra).toEqual({ amount: "[redacted]", route: "/api/transactions" });
    expect(out.contexts).toEqual({ tx: { id: "t1", note: "[redacted]" } });
  });

  it("returns the event (kept, not dropped) when there is nothing to scrub", () => {
    const event = { message: "boom" } as unknown as ErrorEvent;
    expect(scrubEvent(event)).toBe(event);
  });
});
