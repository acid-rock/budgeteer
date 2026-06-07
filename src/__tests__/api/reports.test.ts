import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetRequiredUser, mockPrisma } = vi.hoisted(() => ({
  mockGetRequiredUser: vi.fn(),
  mockPrisma: {
    transaction: { groupBy: vi.fn() },
    budget: { findMany: vi.fn() },
    category: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

import { GET } from "@/app/api/reports/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(month?: string) {
  const url = month
    ? `http://localhost/api/reports?month=${month}`
    : "http://localhost/api/reports";
  return new Request(url);
}

// Sets up the four mocked DB calls used by every report query.
// groupBy is called twice (totalsByType, then spendByCategory).
function setupMocks({
  totalsByType = [] as { type: string; _sum: { amount: string } }[],
  spendByCategory = [] as { categoryId: string; _sum: { amount: string } }[],
  budgets = [] as { categoryId: string; limit: string }[],
  categories = [] as { id: string; name: string; kind: string }[],
} = {}) {
  mockPrisma.transaction.groupBy
    .mockResolvedValueOnce(totalsByType)
    .mockResolvedValueOnce(spendByCategory);
  mockPrisma.budget.findMany.mockResolvedValue(budgets);
  mockPrisma.category.findMany.mockResolvedValue(categories);
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/reports", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    const response = await GET(makeReq("2026-05"));
    expect(response.status).toBe(401);
  });

  it("returns 200 with the correct report shape", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks();

    const response = await GET(makeReq("2026-05"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("month");
    expect(data).toHaveProperty("totalIncome");
    expect(data).toHaveProperty("totalExpenses");
    expect(data).toHaveProperty("netSavings");
    expect(data).toHaveProperty("byCategory");
  });

  it("calculates income, expense totals and net savings correctly", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      totalsByType: [
        { type: "income", _sum: { amount: "50000.00" } },
        { type: "expense", _sum: { amount: "30000.00" } },
      ],
    });

    const { totalIncome, totalExpenses, netSavings } = await (await GET(makeReq("2026-05"))).json();
    expect(totalIncome).toBe(50000);
    expect(totalExpenses).toBe(30000);
    expect(netSavings).toBe(20000);
  });

  it("returns zero totals when there are no transactions", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks();

    const { totalIncome, totalExpenses, netSavings } = await (await GET(makeReq("2026-05"))).json();
    expect(totalIncome).toBe(0);
    expect(totalExpenses).toBe(0);
    expect(netSavings).toBe(0);
  });

  it("produces a negative netSavings when expenses exceed income", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      totalsByType: [
        { type: "income", _sum: { amount: "10000.00" } },
        { type: "expense", _sum: { amount: "15000.00" } },
      ],
    });

    const { netSavings } = await (await GET(makeReq("2026-05"))).json();
    expect(netSavings).toBe(-5000);
  });

  it("returns byCategory sorted by spent amount descending", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      spendByCategory: [
        { categoryId: "cat-1", _sum: { amount: "1000.00" } },
        { categoryId: "cat-2", _sum: { amount: "5000.00" } },
      ],
      categories: [
        { id: "cat-1", name: "Dining Out", kind: "expense" },
        { id: "cat-2", name: "Groceries", kind: "expense" },
      ],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory).toHaveLength(2);
    expect(byCategory[0].categoryName).toBe("Groceries"); // highest spent first
    expect(byCategory[0].spent).toBe(5000);
    expect(byCategory[1].categoryName).toBe("Dining Out");
    expect(byCategory[1].spent).toBe(1000);
  });

  it("attaches the budget limit to a category that has one", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      spendByCategory: [{ categoryId: "cat-1", _sum: { amount: "3000.00" } }],
      budgets: [{ categoryId: "cat-1", limit: "5000.00" }],
      categories: [{ id: "cat-1", name: "Rent", kind: "expense" }],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory[0].limit).toBe(5000);
    expect(byCategory[0].spent).toBe(3000);
  });

  it("sets limit to null for expense categories without a budget", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      spendByCategory: [{ categoryId: "cat-1", _sum: { amount: "1500.00" } }],
      categories: [{ id: "cat-1", name: "Transport", kind: "expense" }],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory[0].limit).toBeNull();
  });

  it("includes expense categories that have a budget but no spending (spent = 0)", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      budgets: [{ categoryId: "cat-1", limit: "3000.00" }],
      categories: [{ id: "cat-1", name: "Gym", kind: "expense" }],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory).toHaveLength(1);
    expect(byCategory[0].spent).toBe(0);
    expect(byCategory[0].limit).toBe(3000);
  });

  it("excludes expense categories with no spending and no budget", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      categories: [{ id: "cat-1", name: "Unused", kind: "expense" }],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory).toHaveLength(0);
  });

  it("excludes income categories from byCategory entirely", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks({
      totalsByType: [{ type: "income", _sum: { amount: "50000.00" } }],
      categories: [{ id: "cat-income", name: "Salary", kind: "income" }],
    });

    const { byCategory } = await (await GET(makeReq("2026-05"))).json();
    expect(byCategory).toHaveLength(0);
  });

  it("uses the current month when no ?month param is provided", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks();

    const response = await GET(makeReq());
    expect(response.status).toBe(200);
    const { month } = await response.json();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });

  it("echoes the requested month back in the response", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks();

    const { month } = await (await GET(makeReq("2026-03"))).json();
    expect(month).toBe("2026-03");
  });

  it("scopes all DB queries to the authenticated user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");
    setupMocks();

    await GET(makeReq("2026-05"));

    // Both groupBy calls and both findMany calls should carry userId
    expect(mockPrisma.transaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
    expect(mockPrisma.budget.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) })
    );
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });
});
