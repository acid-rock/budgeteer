import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    transaction: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    category: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/transactions/route";
import { PATCH, DELETE } from "@/app/api/transactions/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prismaNotFound() {
  return new Prisma.PrismaClientKnownRequestError("Not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });
}

const mockCategory = { id: "cat-1", name: "Groceries", kind: "expense", userId: "user-1" };

function makeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    type: "expense",
    amount: "1500.00",
    date: new Date("2026-05-15"),
    categoryId: "cat-1",
    category: mockCategory,
    note: null,
    userId: "user-1",
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
  // Interactive transactions run the callback with the mock client as `tx`.
  mockPrisma.$transaction.mockImplementation(
    (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma)
  );
});

// ─── GET /api/transactions ────────────────────────────────────────────────────

describe("GET /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("returns the user's transactions with amounts serialized to plain numbers", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.findMany.mockResolvedValue([makeTransaction()]);

    const response = await GET();
    expect(response.status).toBe(200);
    const [tx] = await response.json();
    expect(tx.amount).toBe(1500);
    expect(typeof tx.amount).toBe("number");
  });

  it("scopes the DB query to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await GET();
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  it("returns an empty array when the user has no transactions", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const data = await (await GET()).json();
    expect(data).toEqual([]);
  });
});

// ─── POST /api/transactions ───────────────────────────────────────────────────

describe("POST /api/transactions", () => {
  const url = "http://localhost/api/transactions";

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: 100, categoryId: "cat-1" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(malformedReq(url, "POST"));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/json/i);
  });

  it("returns 400 for an invalid type value", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { type: "banana", amount: 100, categoryId: "cat-1" }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/income.*expense/i);
  });

  it("returns 400 for a negative amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: -50, categoryId: "cat-1" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a zero amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: 0, categoryId: "cat-1" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a non-numeric amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: "abc", categoryId: "cat-1" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when categoryId is missing", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: 100 }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for an unparseable date", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(
      jsonReq(url, "POST", { type: "expense", amount: 100, categoryId: "cat-1", date: "not-a-date" })
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/date/i);
  });

  it("returns 400 for a note over the length limit", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(
      jsonReq(url, "POST", {
        type: "expense",
        amount: 100,
        categoryId: "cat-1",
        note: "x".repeat(501),
      })
    );
    expect(response.status).toBe(400);
  });

  it("returns 404 when the category does not belong to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const response = await POST(jsonReq(url, "POST", { type: "expense", amount: 100, categoryId: "other-cat" }));
    expect(response.status).toBe(404);
  });

  it("creates the transaction and returns 201 with a serialized amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.transaction.create.mockResolvedValue(makeTransaction());

    const response = await POST(
      jsonReq(url, "POST", { type: "expense", amount: 1500, categoryId: "cat-1", date: "2026-05-15" })
    );
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.amount).toBe(1500);
    expect(typeof data.amount).toBe("number");
  });

  it("stamps the authenticated userId onto the created transaction", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.transaction.create.mockResolvedValue(makeTransaction());

    await POST(jsonReq(url, "POST", { type: "expense", amount: 100, categoryId: "cat-1", date: "2026-05-15" }));
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1" }) })
    );
  });

  it("accepts an income type", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(mockCategory);
    mockPrisma.transaction.create.mockResolvedValue(makeTransaction({ type: "income" }));

    const response = await POST(
      jsonReq(url, "POST", { type: "income", amount: 50000, categoryId: "cat-1", date: "2026-05-01" })
    );
    expect(response.status).toBe(201);
  });
});

// ─── PATCH /api/transactions/[id] ────────────────────────────────────────────

describe("PATCH /api/transactions/[id]", () => {
  const url = "http://localhost/api/transactions/tx-1";
  const params = { params: Promise.resolve({ id: "tx-1" }) };

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await PATCH(jsonReq(url, "PATCH", { amount: 2000 }), params);
    expect(response.status).toBe(401);
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(malformedReq(url, "PATCH"), params);
    expect(response.status).toBe(400);
  });

  it("returns 400 for an invalid type value", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(jsonReq(url, "PATCH", { type: "invalid" }), params);
    expect(response.status).toBe(400);
  });

  it("returns 400 for a negative amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(jsonReq(url, "PATCH", { amount: -100 }), params);
    expect(response.status).toBe(400);
  });

  it("returns 400 for a zero amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(jsonReq(url, "PATCH", { amount: 0 }), params);
    expect(response.status).toBe(400);
  });

  it("returns 404 when the transaction does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.update.mockRejectedValue(prismaNotFound());

    const response = await PATCH(jsonReq(url, "PATCH", { amount: 2000 }), params);
    expect(response.status).toBe(404);
  });

  it("returns 404 when changing to a category not owned by the user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const response = await PATCH(jsonReq(url, "PATCH", { categoryId: "other-cat" }), params);
    expect(response.status).toBe(404);
  });

  it("updates the amount and returns the serialized transaction", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ amount: "2000.00" }));

    const response = await PATCH(jsonReq(url, "PATCH", { amount: 2000 }), params);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.amount).toBe(2000);
    expect(typeof data.amount).toBe("number");
  });

  it("updates the type when a valid type is provided", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction({ type: "income" }));

    const response = await PATCH(jsonReq(url, "PATCH", { type: "income" }), params);
    expect(response.status).toBe(200);
  });

  it("enforces ownership — passes { id, userId } to the update where clause", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.update.mockResolvedValue(makeTransaction());

    await PATCH(jsonReq(url, "PATCH", { amount: 500 }), params);
    expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tx-1", userId: "user-1" } })
    );
  });
});

// ─── DELETE /api/transactions/[id] ───────────────────────────────────────────

describe("DELETE /api/transactions/[id]", () => {
  function deleteReq(id: string) {
    return new Request(`http://localhost/api/transactions/${id}`, { method: "DELETE" });
  }

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await DELETE(deleteReq("tx-1"), { params: Promise.resolve({ id: "tx-1" }) });
    expect(response.status).toBe(401);
  });

  it("deletes the transaction and returns 204", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.delete.mockResolvedValue({});

    const response = await DELETE(deleteReq("tx-1"), { params: Promise.resolve({ id: "tx-1" }) });
    expect(response.status).toBe(204);
  });

  it("returns 404 when the transaction does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.delete.mockRejectedValue(prismaNotFound());

    const response = await DELETE(deleteReq("tx-1"), { params: Promise.resolve({ id: "tx-1" }) });
    expect(response.status).toBe(404);
  });

  it("enforces ownership — passes { id, userId } to the delete where clause", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.delete.mockResolvedValue({});

    await DELETE(deleteReq("tx-1"), { params: Promise.resolve({ id: "tx-1" }) });
    expect(mockPrisma.transaction.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tx-1", userId: "user-1" } })
    );
  });
});
