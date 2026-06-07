import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock objects ──────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file before any variable
// declarations, so the objects they reference must be hoisted too.

const { mockCookieStore, mockPrisma, capturedState } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
  },
  mockPrisma: {
    user: { findUnique: vi.fn() },
    account: { create: vi.fn() },
    category: { createMany: vi.fn() },
  },
  // Wrapper object so the next-auth factory can assign into it after hoisting.
  capturedState: { config: null as Record<string, any> | null },
}));

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookieStore),
}));

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: () => ({}),
}));

vi.mock("@/auth.config", () => ({
  authConfig: {
    providers: [],
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ auth }: { auth: unknown }) => !!auth },
  },
}));

vi.mock("next-auth", () => ({
  default: (config: Record<string, any>) => {
    capturedState.config = config;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
}));

// Importing @/auth triggers NextAuth({...}), which populates capturedConfig.
import "@/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type User = { id?: string; email?: string };
type Account = {
  type: string;
  provider: string;
  providerAccountId: string;
  [key: string]: unknown;
};

function makeUser(overrides: Partial<User> = {}): User {
  return { id: "user-1", email: "user@example.com", ...overrides };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    type: "oauth",
    provider: "google",
    providerAccountId: "google-abc123",
    access_token: "access-tok",
    refresh_token: null,
    expires_at: null,
    token_type: "Bearer",
    scope: "openid email profile",
    id_token: "id-tok",
    session_state: null,
    ...overrides,
  };
}

function callSignIn(user: User, account: Account | null) {
  return capturedState.config!.callbacks.signIn({ user, account }) as Promise<boolean | string>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe("signIn callback — early exit", () => {
  it("returns true immediately for non-oauth account types without touching the DB", async () => {
    const result = await callSignIn(makeUser(), makeAccount({ type: "credentials" }));

    expect(result).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("signIn callback — manual linking flow (cookie present)", () => {
  it("creates an Account record and re-points user.id when linking a new provider", async () => {
    mockCookieStore.get.mockReturnValue({ value: "existing-user-id" });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user-id",
      accounts: [{ provider: "github" }],
    });
    mockPrisma.account.create.mockResolvedValue({});

    const user = makeUser({ id: "new-google-sub" });
    const result = await callSignIn(user, makeAccount({ provider: "google" }));

    expect(result).toBe(true);
    expect(mockPrisma.account.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "existing-user-id",
          provider: "google",
        }),
      })
    );
    expect(user.id).toBe("existing-user-id");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("budgeteer_link_user_id");
  });

  it("skips account creation and only re-points user.id when the provider is already linked", async () => {
    mockCookieStore.get.mockReturnValue({ value: "existing-user-id" });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user-id",
      accounts: [{ provider: "github" }, { provider: "google" }],
    });

    const user = makeUser({ id: "whatever" });
    const result = await callSignIn(user, makeAccount({ provider: "google" }));

    expect(result).toBe(true);
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
    expect(user.id).toBe("existing-user-id");
  });

  it("falls through gracefully and returns true when the cookie references a non-existent user", async () => {
    mockCookieStore.get.mockReturnValue({ value: "ghost-user-id" });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await callSignIn(makeUser(), makeAccount());

    expect(result).toBe(true);
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("budgeteer_link_user_id");
  });
});

describe("signIn callback — normal sign-in flow (no cookie)", () => {
  it("redirects to /login with provider info when the email is already registered under a different provider", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user-id",
      accounts: [{ provider: "github" }],
    });

    const result = await callSignIn(
      makeUser({ email: "user@example.com" }),
      makeAccount({ provider: "google" })
    );

    expect(result).toBe(
      "/login?error=AccountExistsWithDifferentProvider&provider=github"
    );
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("returns true when the same provider re-authenticates an existing user", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "existing-user-id",
      accounts: [{ provider: "github" }],
    });

    const result = await callSignIn(
      makeUser({ email: "user@example.com" }),
      makeAccount({ provider: "github" })
    );

    expect(result).toBe(true);
    expect(mockPrisma.account.create).not.toHaveBeenCalled();
  });

  it("returns true for a brand-new email with no existing account", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await callSignIn(
      makeUser({ email: "new@example.com" }),
      makeAccount({ provider: "github" })
    );

    expect(result).toBe(true);
  });

  it("returns true when the user object has no email (skips conflict check)", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const result = await callSignIn(makeUser({ email: undefined }), makeAccount());

    expect(result).toBe(true);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("jwt callback", () => {
  it("stamps user.id onto the token on the first sign-in", () => {
    const token: Record<string, unknown> = {};
    const user = { id: "user-123" };

    const result = capturedState.config!.callbacks.jwt({ token, user });

    expect(result).toMatchObject({ id: "user-123" });
  });

  it("passes the token through unchanged on subsequent calls when user is absent", () => {
    const token = { id: "user-123", sub: "sub-abc" };

    const result = capturedState.config!.callbacks.jwt({ token, user: undefined });

    expect(result).toEqual(token);
  });
});

describe("session callback", () => {
  it("copies token.id into session.user.id", () => {
    const session = { user: { name: "Alice", email: "alice@example.com" } };
    const token = { id: "user-123" };

    const result = capturedState.config!.callbacks.session({ session, token });

    expect(result.user.id).toBe("user-123");
  });
});
