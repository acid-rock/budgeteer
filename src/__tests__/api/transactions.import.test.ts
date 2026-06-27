import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    category: { findFirst: vi.fn(), create: vi.fn() },
    transaction: { createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/transactions/import/route";

// A raw text/csv body — the route accepts this alongside multipart uploads.
function csvReq(body: string) {
  return new Request("http://localhost/api/transactions/import", {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body,
  });
}

const HEADER = "Date,Type,Category,Note,Amount";

beforeEach(() => {
  vi.resetAllMocks();
  mockPrisma.$transaction.mockImplementation(
    (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma)
  );
  mockPrisma.transaction.createMany.mockResolvedValue({ count: 0 });
});

describe("POST /api/transactions/import", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    expect((await POST(csvReq(HEADER))).status).toBe(401);
  });

  it("returns 400 for an empty file", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const res = await POST(csvReq("   \n  "));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/empty/i);
  });

  it("returns 400 listing missing required columns", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const res = await POST(csvReq("Date,Category\n2026-01-01,Food"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Type.*Amount/);
  });

  it("returns 400 when the file has a header but no data rows", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const res = await POST(csvReq(HEADER));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/no data rows/i);
  });

  it("rejects the whole file on a bad row, naming the spreadsheet row number", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const body = [
      HEADER,
      "2026-01-01,expense,Food,,12.50",
      "2026-01-02,expense,Food,,-5", // negative amount → invalid
    ].join("\n");

    const res = await POST(csvReq(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/^Row 3:/);
    // No partial import — the DB is never touched.
    expect(mockPrisma.transaction.createMany).not.toHaveBeenCalled();
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown type value", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    const res = await POST(csvReq(`${HEADER}\n2026-01-01,transfer,Food,,5`));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/income.*expense/i);
  });

  it("matches existing categories, creates missing ones, and inserts all rows", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    // "Food" already exists; "Salary" does not.
    mockPrisma.category.findFirst.mockImplementation(
      ({ where }: { where: { name: string } }) =>
        where.name === "Food" ? { id: "cat-food" } : null
    );
    mockPrisma.category.create.mockResolvedValue({ id: "cat-salary" });

    const body = [
      HEADER,
      "2026-01-01,expense,Food,Lunch,12.50",
      "2026-01-05,expense,Food,,8",
      "2026-01-31,income,Salary,,5000",
    ].join("\n");

    const res = await POST(csvReq(body));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ imported: 3, categoriesCreated: 1 });

    // Food matched once (cached for the 2nd Food row), Salary created once.
    expect(mockPrisma.category.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Salary", kind: "income", userId: "user-1" }),
      })
    );

    const createManyArg = mockPrisma.transaction.createMany.mock.calls[0][0];
    expect(createManyArg.data).toHaveLength(3);
    expect(createManyArg.data[0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        type: "expense",
        amount: 12.5,
        categoryId: "cat-food",
        note: "Lunch",
      })
    );
    expect(createManyArg.data[2]).toEqual(
      expect.objectContaining({ type: "income", categoryId: "cat-salary", amount: 5000 }),
    );
    // Empty note cell becomes null, not "".
    expect(createManyArg.data[1].note).toBeNull();
  });

  it("imports a file that has no Note column", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    mockPrisma.category.findFirst.mockResolvedValue({ id: "cat-food" });

    const res = await POST(csvReq("Date,Type,Category,Amount\n2026-01-01,expense,Food,9"));
    expect(res.status).toBe(201);
    const arg = mockPrisma.transaction.createMany.mock.calls[0][0];
    expect(arg.data[0].note).toBeNull();
  });
});
