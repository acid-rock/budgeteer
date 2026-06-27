import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    category: { findFirst: vi.fn() },
    transaction: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/savings/movements/route";

const bucket = { id: "bucket-1", name: "Emergency", kind: "savings", userId: "user-1" };

function movement(overrides: Record<string, unknown> = {}) {
  return {
    id: "mv-1",
    type: "deposit",
    amount: "500.00",
    date: new Date("2026-06-01"),
    categoryId: "bucket-1",
    category: bucket,
    note: null,
    userId: "user-1",
    ...overrides,
  };
}

function postReq(body: unknown) {
  return new Request("http://localhost/api/savings/movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(qs = "") {
  return new Request(
    `http://localhost/api/savings/movements${qs ? `?${qs}` : ""}`
  );
}

// A Postgres serialization failure, as Prisma surfaces it under Serializable
// isolation when two transactions race.
function writeConflict() {
  return new Prisma.PrismaClientKnownRequestError(
    "Transaction failed due to a write conflict or a deadlock.",
    { code: "P2034", clientVersion: "6.0.0" }
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  // Run the interactive transaction callback against the mock client.
  mockPrisma.$transaction.mockImplementation(
    (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma)
  );
});

// ─── GET ────────────────────────────────────────────────────────────────────

describe("GET /api/savings/movements", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    expect((await GET(getReq())).status).toBe(401);
  });

  it("lists movements scoped to the user and to deposit/withdraw types", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.transaction.findMany.mockResolvedValue([movement()]);

    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const { items } = await res.json();
    expect(items[0].amount).toBe(500);
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          type: { in: ["deposit", "withdraw"] },
        }),
      })
    );
  });

  it("404s when ?categoryId is not owned by the user (ownership pre-check)", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const res = await GET(getReq("categoryId=someone-elses"));
    expect(res.status).toBe(404);
    // Never reaches the list query.
    expect(mockPrisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it("lists for an owned ?categoryId", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue({ id: "bucket-1" });
    mockPrisma.transaction.findMany.mockResolvedValue([]);

    const res = await GET(getReq("categoryId=bucket-1"));
    expect(res.status).toBe(200);
    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bucket-1", userId: "user-1" } })
    );
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

describe("POST /api/savings/movements", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const res = await POST(postReq({ type: "deposit", amount: 100, categoryId: "bucket-1" }));
    expect(res.status).toBe(401);
  });

  it("404s when the bucket is missing or not a savings category", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(null);

    const res = await POST(postReq({ type: "deposit", amount: 100, categoryId: "x" }));
    expect(res.status).toBe(404);
  });

  it("creates a deposit and returns 201 with a serialized amount", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(bucket);
    mockPrisma.transaction.create.mockResolvedValue(movement({ amount: "500.00" }));

    const res = await POST(postReq({ type: "deposit", amount: 500, categoryId: "bucket-1" }));
    expect(res.status).toBe(201);
    expect((await res.json()).amount).toBe(500);
  });

  it("runs the create under Serializable isolation", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(bucket);
    mockPrisma.transaction.create.mockResolvedValue(movement());

    await POST(postReq({ type: "deposit", amount: 500, categoryId: "bucket-1" }));
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("rejects a withdrawal that exceeds the running balance (400)", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(bucket);
    // balance = 1000 deposited − 200 withdrawn = 800
    mockPrisma.transaction.groupBy.mockResolvedValue([
      { type: "deposit", _sum: { amount: "1000.00" } },
      { type: "withdraw", _sum: { amount: "200.00" } },
    ]);

    const res = await POST(postReq({ type: "withdraw", amount: 900, categoryId: "bucket-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/more than the bucket balance/i);
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });

  it("allows a withdrawal within balance (201)", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue(bucket);
    mockPrisma.transaction.groupBy.mockResolvedValue([
      { type: "deposit", _sum: { amount: "1000.00" } },
      { type: "withdraw", _sum: { amount: "200.00" } },
    ]);
    mockPrisma.transaction.create.mockResolvedValue(
      movement({ type: "withdraw", amount: "800.00" })
    );

    const res = await POST(postReq({ type: "withdraw", amount: 800, categoryId: "bucket-1" }));
    expect(res.status).toBe(201);
  });

  it("loses the over-withdraw race cleanly: a serialization conflict becomes a 409", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    // Both concurrent withdrawals read the same balance and pass the in-tx check;
    // Postgres aborts the one that would over-withdraw with a P2034 write
    // conflict. The route must surface 409, never a successful over-withdraw.
    mockPrisma.$transaction.mockRejectedValue(writeConflict());

    const res = await POST(postReq({ type: "withdraw", amount: 800, categoryId: "bucket-1" }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/conflict|try again/i);
  });
});
