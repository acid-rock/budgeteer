import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

// logger reads NODE_ENV / ERROR_SINK_URL at call time, so each test sets them
// and restores afterwards. console is silenced so test output stays clean.
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_SINK = process.env.ERROR_SINK_URL;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  if (ORIGINAL_SINK === undefined) delete process.env.ERROR_SINK_URL;
  else process.env.ERROR_SINK_URL = ORIGINAL_SINK;
});

describe("logger error sink", () => {
  it("forwards error-level logs to ERROR_SINK_URL in production", () => {
    process.env.NODE_ENV = "production";
    process.env.ERROR_SINK_URL = "https://sink.example/hook";

    logger.error("boom", new Error("kaboom"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://sink.example/hook");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ level: "error", message: "boom" });
    expect(body.meta).toMatchObject({ name: "Error", message: "kaboom" });
  });

  it("redacts finance/PII values in object meta before forwarding", () => {
    process.env.NODE_ENV = "production";
    process.env.ERROR_SINK_URL = "https://sink.example/hook";

    logger.error("tx failed", { userId: "u1", amount: 99, note: "rent" });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.meta).toEqual({
      userId: "u1",
      amount: "[redacted]",
      note: "[redacted]",
    });
  });

  it("does not forward warn or info levels", () => {
    process.env.NODE_ENV = "production";
    process.env.ERROR_SINK_URL = "https://sink.example/hook";

    logger.warn("just a warning");
    logger.info("just info");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not forward outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.ERROR_SINK_URL = "https://sink.example/hook";

    logger.error("boom");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when ERROR_SINK_URL is unset", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ERROR_SINK_URL;

    logger.error("boom");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows a sink failure (never throws from a log call)", () => {
    process.env.NODE_ENV = "production";
    process.env.ERROR_SINK_URL = "https://sink.example/hook";
    fetchMock.mockRejectedValue(new Error("network down"));

    expect(() => logger.error("boom")).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
