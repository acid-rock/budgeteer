import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    budget: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/budgets/route";
import { PATCH, DELETE } from "@/app/api/budgets/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prismaNotFound() {
  return new Prisma.PrismaClientKnownRequestError("Not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });
}

const mockCategory = { id: "cat-1", name: "Groceries", kind: "expense", userId: "user-1" };

function makeBudget(overrides: Record<string, unknown> = {}) {
  return {
    id: "b-1",
    categoryId: "cat-1",
    month: new Date("2026-05-01T00:00:00.000Z"),
    limit: "5000.00",
    userId: "user-1",
    category: mockCategory,
    ...overrides,
  };
}

function jsonReq(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// A request whose body is not valid JSON, to exercise the parseJson guard.
function malformedReq(url: string, method: string) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: "{ not valid json",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/budgets ─────────────────────────────────────────────────────────

describe("GET /api/budgets", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/budgets"));
    expect(response.status).toBe(401);
  });

  it("returns all budgets for the user with serialized limits", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.findMany.mockResolvedValue([makeBudget()]);

    const response = await GET(new Request("http://localhost/api/budgets"));
    expect(response.status).toBe(200);
    const [budget] = await response.json();
    expect(budget.limit).toBe(5000);
    expect(typeof budget.limit).toBe("number");
  });

  it("scopes the query to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/budgets"));
    expect(mockPrisma.budget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  it("filters by month when the ?month query param is provided", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/budgets?month=2026-05"));
    expect(mockPrisma.budget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          month: new Date("2026-05-01T00:00:00.000Z"),
        }),
      })
    );
  });

  it("does not include a month filter when no ?month param is provided", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/budgets"));
    const callArgs = mockPrisma.budget.findMany.mock.calls[0][0];
    expect(callArgs.where).not.toHaveProperty("month");
  });
});

// ─── POST /api/budgets ────────────────────────────────────────────────────────

describe("POST /api/budgets", () => {
  const url = "http://localhost/api/budgets";

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await POST(jsonReq(url, "POST", { categoryId: "cat-1", month: "2026-05", limit: 5000 }));
    expect(response.status).toBe(401);
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(malformedReq(url, "POST"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/json/i);
  });

  it("returns 400 when categoryId is missing", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { month: "2026-05", limit: 5000 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when month is missing", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { categoryId: "cat-1", limit: 5000 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a negative limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { categoryId: "cat-1", month: "2026-05", limit: -100 }));
    expect(response.status).toBe(400);
  });

  it("accepts a limit of zero (budget exists but no cap)", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.budget.upsert.mockResolvedValue(makeBudget({ limit: "0.00" }));

    const response = await POST(jsonReq(url, "POST", { categoryId: "cat-1", month: "2026-05", limit: 0 }));
    expect(response.status).toBe(201);
  });

  it("returns 404 when the category does not belong to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const response = await POST(jsonReq(url, "POST", { categoryId: "other-cat", month: "2026-05", limit: 5000 }));
    expect(response.status).toBe(404);
  });

  it("upserts the budget and returns 201 with a serialized limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.budget.upsert.mockResolvedValue(makeBudget());

    const response = await POST(jsonReq(url, "POST", { categoryId: "cat-1", month: "2026-05", limit: 5000 }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.limit).toBe(5000);
    expect(typeof data.limit).toBe("number");
  });

  it("passes the correct UTC month date to the upsert", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.budget.upsert.mockResolvedValue(makeBudget());

    await POST(jsonReq(url, "POST", { categoryId: "cat-1", month: "2026-05", limit: 5000 }));

    const upsertArgs = mockPrisma.budget.upsert.mock.calls[0][0];
    expect(upsertArgs.create.month).toEqual(new Date("2026-05-01T00:00:00.000Z"));
  });
});

// ─── PATCH /api/budgets/[id] ──────────────────────────────────────────────────

describe("PATCH /api/budgets/[id]", () => {
  const url = "http://localhost/api/budgets/b-1";
  const params = { params: Promise.resolve({ id: "b-1" }) };

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await PATCH(jsonReq(url, "PATCH", { limit: 6000 }), params);
    expect(response.status).toBe(401);
  });

  it("returns 400 for a negative limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(jsonReq(url, "PATCH", { limit: -1 }), params);
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-numeric limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(jsonReq(url, "PATCH", { limit: "abc" }), params);
    expect(response.status).toBe(400);
  });

  it("allows updating to a zero limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.update.mockResolvedValue(makeBudget({ limit: "0.00" }));

    const response = await PATCH(jsonReq(url, "PATCH", { limit: 0 }), params);
    expect(response.status).toBe(200);
  });

  it("updates the limit and returns the serialized budget", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.update.mockResolvedValue(makeBudget({ limit: "6000.00" }));

    const response = await PATCH(jsonReq(url, "PATCH", { limit: 6000 }), params);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.limit).toBe(6000);
    expect(typeof data.limit).toBe("number");
  });

  it("returns 404 when the budget does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.update.mockRejectedValue(prismaNotFound());

    const response = await PATCH(
      jsonReq("http://localhost/api/budgets/bad-id", "PATCH", { limit: 6000 }),
      { params: Promise.resolve({ id: "bad-id" }) }
    );
    expect(response.status).toBe(404);
  });

  it("enforces ownership — passes { id, userId } to the update where clause", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.update.mockResolvedValue(makeBudget());

    await PATCH(jsonReq(url, "PATCH", { limit: 6000 }), params);
    expect(mockPrisma.budget.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b-1", userId: "user-1" } })
    );
  });
});

// ─── DELETE /api/budgets/[id] ─────────────────────────────────────────────────

describe("DELETE /api/budgets/[id]", () => {
  function deleteReq(id: string) {
    return new Request(`http://localhost/api/budgets/${id}`, { method: "DELETE" });
  }

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await DELETE(deleteReq("b-1"), { params: Promise.resolve({ id: "b-1" }) });
    expect(response.status).toBe(401);
  });

  it("deletes the budget and returns 204", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.delete.mockResolvedValue({});

    const response = await DELETE(deleteReq("b-1"), { params: Promise.resolve({ id: "b-1" }) });
    expect(response.status).toBe(204);
  });

  it("returns 404 when the budget does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.delete.mockRejectedValue(prismaNotFound());

    const response = await DELETE(deleteReq("bad-id"), { params: Promise.resolve({ id: "bad-id" }) });
    expect(response.status).toBe(404);
  });

  it("enforces ownership — passes { id, userId } to the delete where clause", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.budget.delete.mockResolvedValue({});

    await DELETE(deleteReq("b-1"), { params: Promise.resolve({ id: "b-1" }) });
    expect(mockPrisma.budget.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "b-1", userId: "user-1" } })
    );
  });
});
