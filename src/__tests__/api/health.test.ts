import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { $queryRaw: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/health", () => {
  it("returns 200 { status: 'ok' } when the database is reachable", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns 503 when the database query fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("connection refused"));

    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe("error");
  });
});
