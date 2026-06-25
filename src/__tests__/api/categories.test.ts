import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    category: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: { count: vi.fn() },
    budget: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/categories/route";
import { PATCH, DELETE } from "@/app/api/categories/[id]/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prismaNotFound() {
  return new Prisma.PrismaClientKnownRequestError("Not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });
}

function prismaUniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed.", {
    code: "P2002",
    clientVersion: "6.0.0",
  });
}

function makeCategory(overrides = {}) {
  // Mirrors a real Category row, including the nullable `target` column added in
  // the savings migration — the API serializes every category through
  // serializeCategory, which always emits `target` (null for income/expense).
  return { id: "cat-1", name: "Groceries", kind: "expense", userId: "user-1", target: null, ...overrides };
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

// ─── GET /api/categories ──────────────────────────────────────────────────────

describe("GET /api/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the authenticated user's categories", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const categories = [
      makeCategory({ id: "cat-1", name: "Groceries", kind: "expense" }),
      makeCategory({ id: "cat-2", name: "Salary", kind: "income" }),
    ];
    mockPrisma.category.findMany.mockResolvedValue(categories);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(categories);
  });

  it("scopes the DB query to the authenticated user's id", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findMany.mockResolvedValue([]);

    await GET();

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });

  it("returns an empty array when the user has no categories", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findMany.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });
});

// ─── POST /api/categories ─────────────────────────────────────────────────────

describe("POST /api/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Test", kind: "expense" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(malformedReq("http://localhost/api/categories", "POST"));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/json/i);
  });

  it("returns 400 when name is an empty string", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "", kind: "expense" }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/name is required/i);
  });

  it("returns 400 when name is only whitespace", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "   ", kind: "expense" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when name is absent from the body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { kind: "expense" }));
    expect(response.status).toBe(400);
  });

  it("creates an expense category and returns 201", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const created = makeCategory();
    mockPrisma.category.create.mockResolvedValue(created);

    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Groceries", kind: "expense" }));
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual(created);
  });

  it("creates an income category and returns 201", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const created = makeCategory({ name: "Salary", kind: "income" });
    mockPrisma.category.create.mockResolvedValue(created);

    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Salary", kind: "income" }));
    expect(response.status).toBe(201);
    expect(mockPrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: "income" }) })
    );
  });

  it("returns 400 when an unrecognised kind is supplied", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Test", kind: "other" }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/kind/i);
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("returns 400 when kind is absent from the body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Test" }));
    expect(response.status).toBe(400);
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("trims whitespace from name before saving", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.create.mockResolvedValue(makeCategory({ name: "Groceries" }));

    await POST(jsonReq("http://localhost/api/categories", "POST", { name: "  Groceries  ", kind: "expense" }));
    expect(mockPrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Groceries" }) })
    );
  });

  it("returns 409 when a duplicate name+kind already exists for the user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.create.mockRejectedValue(prismaUniqueConflict());

    const response = await POST(jsonReq("http://localhost/api/categories", "POST", { name: "Groceries", kind: "expense" }));
    expect(response.status).toBe(409);
  });
});

// ─── PATCH /api/categories/[id] ───────────────────────────────────────────────

describe("PATCH /api/categories/[id]", () => {
  const params = { params: Promise.resolve({ id: "cat-1" }) };

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { name: "Updated" }),
      params
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 (not 500) for a malformed JSON body", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(
      malformedReq("http://localhost/api/categories/cat-1", "PATCH"),
      params
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when name is an empty string", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { name: "" }),
      params
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when kind is neither 'income' nor 'expense'", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { kind: "invalid" }),
      params
    );
    expect(response.status).toBe(400);
  });

  it("updates the category name and returns 200", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const updated = makeCategory({ name: "Renamed Groceries" });
    mockPrisma.category.update.mockResolvedValue(updated);

    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { name: "Renamed Groceries" }),
      params
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe("Renamed Groceries");
  });

  it("updates the category kind and returns 200", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const updated = makeCategory({ kind: "income" });
    mockPrisma.category.update.mockResolvedValue(updated);

    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { kind: "income" }),
      params
    );
    expect(response.status).toBe(200);
    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: "income" }) })
    );
  });

  it("returns 404 when the category does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.update.mockRejectedValue(prismaNotFound());

    const response = await PATCH(
      jsonReq("http://localhost/api/categories/bad-id", "PATCH", { name: "X" }),
      { params: Promise.resolve({ id: "bad-id" }) }
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 when the new name+kind conflicts with an existing category", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.update.mockRejectedValue(prismaUniqueConflict());

    const response = await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { name: "Existing" }),
      params
    );
    expect(response.status).toBe(409);
  });

  it("enforces ownership — passes { id, userId } to the update where clause", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.update.mockResolvedValue(makeCategory());

    await PATCH(
      jsonReq("http://localhost/api/categories/cat-1", "PATCH", { name: "X" }),
      params
    );
    expect(mockPrisma.category.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "cat-1", userId: "user-1" } })
    );
  });
});

// ─── DELETE /api/categories/[id] ──────────────────────────────────────────────

describe("DELETE /api/categories/[id]", () => {
  function deleteReq(id: string) {
    return new Request(`http://localhost/api/categories/${id}`, { method: "DELETE" });
  }

  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 409 when the category is referenced by transactions", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(3);
    mockPrisma.budget.count.mockResolvedValue(0);

    const response = await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain("3 transaction");
  });

  it("returns 409 when the category is referenced by budgets", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.budget.count.mockResolvedValue(2);

    const response = await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toContain("2 budget");
  });

  it("returns 409 when the category is referenced by both transactions and budgets", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(5);
    mockPrisma.budget.count.mockResolvedValue(1);

    const response = await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(409);
  });

  it("deletes an unused category and returns 204", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.budget.count.mockResolvedValue(0);
    mockPrisma.category.delete.mockResolvedValue({});

    const response = await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });
    expect(response.status).toBe(204);
  });

  it("returns 404 when the category does not exist or belongs to another user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.budget.count.mockResolvedValue(0);
    mockPrisma.category.delete.mockRejectedValue(prismaNotFound());

    const response = await DELETE(deleteReq("bad-id"), { params: Promise.resolve({ id: "bad-id" }) });
    expect(response.status).toBe(404);
  });

  it("scopes the usage count queries to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.budget.count.mockResolvedValue(0);
    mockPrisma.category.delete.mockResolvedValue({});

    await DELETE(deleteReq("cat-1"), { params: Promise.resolve({ id: "cat-1" }) });

    expect(mockPrisma.transaction.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
    expect(mockPrisma.budget.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
  });
});
