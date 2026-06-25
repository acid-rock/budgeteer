import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  DIRECT_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "secret",
  AUTH_GITHUB_ID: "gh-id",
  AUTH_GITHUB_SECRET: "gh-secret",
  AUTH_GOOGLE_ID: "g-id",
  AUTH_GOOGLE_SECRET: "g-secret",
};

describe("parseEnv", () => {
  it("returns the typed env when all required vars are present", () => {
    const env = parseEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("ignores unknown keys (so passing full process.env is safe)", () => {
    const env = parseEnv({ ...valid, SOME_OTHER_VAR: "x" });
    expect(env).not.toHaveProperty("SOME_OTHER_VAR");
  });

  it("throws a clear error naming a missing required var", () => {
    const partial = { ...valid } as Record<string, string | undefined>;
    delete partial.DATABASE_URL;
    expect(() => parseEnv(partial)).toThrowError(/DATABASE_URL/);
  });

  it("rejects a blank required var", () => {
    expect(() => parseEnv({ ...valid, AUTH_SECRET: "" })).toThrowError(
      /AUTH_SECRET/
    );
  });

  it("treats a blank optional var as unset", () => {
    const env = parseEnv({ ...valid, UPSTASH_REDIS_REST_URL: "" });
    expect(env.UPSTASH_REDIS_REST_URL).toBeUndefined();
  });

  it("accepts optional Upstash vars when provided", () => {
    const env = parseEnv({
      ...valid,
      UPSTASH_REDIS_REST_URL: "https://x.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "tok",
    });
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://x.upstash.io");
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("tok");
  });
});
