import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetRequiredUser, mockPrisma, mockCookieDelete, mockLogger } =
  vi.hoisted(() => ({
    mockGetRequiredUser: vi.fn(),
    mockPrisma: {
      transaction: { deleteMany: vi.fn() },
      budget: { deleteMany: vi.fn() },
      category: { deleteMany: vi.fn() },
      user: { delete: vi.fn() },
      $transaction: vi.fn(),
    },
    mockCookieDelete: vi.fn(),
    mockLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  }));

vi.mock("@/lib/session", () => ({ getRequiredUser: mockGetRequiredUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: mockCookieDelete }),
}));

import { DELETE } from "@/app/api/account/route";

function prismaNotFound() {
  return new Prisma.PrismaClientKnownRequestError("Not found.", {
    code: "P2025",
    clientVersion: "6.0.0",
  });
}

const req = () =>
  new Request("http://localhost/api/account", { method: "DELETE" });

beforeEach(() => {
  vi.resetAllMocks();
  // $transaction([...]) eagerly evaluates the array (calling each delete to get
  // its promise), so the per-model spies record their calls; resolve the batch.
  mockPrisma.$transaction.mockResolvedValue([]);
});

describe("DELETE /api/account", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetRequiredUser.mockResolvedValue(null);
    expect((await DELETE(req())).status).toBe(401);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("removes the user's data scoped to their id and deletes the user", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");

    const res = await DELETE(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    // Restrict-protected children go first, then the user (cascading the rest).
    expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPrisma.budget.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    // All four run atomically in one transaction.
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("clears the session cookies so the orphaned JWT can't be replayed", async () => {
    mockGetRequiredUser.mockResolvedValue("user-1");

    await DELETE(req());
    expect(mockCookieDelete).toHaveBeenCalledWith("authjs.session-token");
    expect(mockCookieDelete).toHaveBeenCalledWith("__Secure-authjs.session-token");
  });

  it("returns 404 when the user no longer exists", async () => {
    mockGetRequiredUser.mockResolvedValue("ghost");
    mockPrisma.$transaction.mockRejectedValue(prismaNotFound());

    const res = await DELETE(req());
    expect(res.status).toBe(404);
    // Session cookies are not touched when the delete failed.
    expect(mockCookieDelete).not.toHaveBeenCalled();
  });
});
