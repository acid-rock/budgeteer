import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

const STARTER_CATEGORIES: { name: string; kind: "income" | "expense" }[] = [
  { name: "Salary", kind: "income" },
  { name: "Freelance", kind: "income" },
  { name: "Investments", kind: "income" },
  { name: "Allowance", kind: "income" },
  { name: "Miscellaneous", kind: "income" },
  { name: "Groceries", kind: "expense" },
  { name: "Rent", kind: "expense" },
  { name: "Dining Out", kind: "expense" },
  { name: "Transport", kind: "expense" },
  { name: "Miscellaneous", kind: "expense" },
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (account?.type !== "oauth") return true;

      try {
        const cookieStore = await cookies();
        const linkUserId = cookieStore.get("budgeteer_link_user_id")?.value;

        if (linkUserId) {
          // ── Manual linking flow ──────────────────────────────────────────
          // The user is already signed in and clicked "Connect [provider]"
          // from the Settings page. The server action stored their userId in
          // a short-lived cookie before triggering this OAuth flow.

          const existingUser = await prisma.user.findUnique({
            where: { id: linkUserId },
            include: { accounts: { select: { provider: true } } },
          });

          cookieStore.delete("budgeteer_link_user_id");

          if (!existingUser) {
            // Stale/invalid cookie — fall through to normal sign-in.
            return true;
          }

          if (existingUser.accounts.some((a) => a.provider === account.provider)) {
            // Provider already linked — sign them in as the existing user.
            user.id = linkUserId;
            return true;
          }

          // Create the Account record linking the new provider to the
          // existing user BEFORE Auth.js's adapter runs. The adapter's
          // getUserByAccount call will find it and return the existing user,
          // so no duplicate is created and no new user is made.
          await prisma.account.create({
            data: {
              userId: linkUserId,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token ?? null,
              refresh_token: account.refresh_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: account.session_state?.toString() ?? null,
            },
          });

          user.id = linkUserId;
          return true;
        }

        // ── Normal sign-in flow ──────────────────────────────────────────
        // No linking intent cookie. Check whether this email is already
        // registered with a different provider and give a friendly redirect
        // rather than Auth.js's generic OAuthAccountNotLinked error page.
        if (user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { accounts: { select: { provider: true } } },
          });

          if (
            existingUser &&
            !existingUser.accounts.some((a) => a.provider === account.provider)
          ) {
            const existingProvider = existingUser.accounts[0]?.provider ?? "another provider";
            return `/login?error=AccountExistsWithDifferentProvider&provider=${existingProvider}`;
          }
        }

        return true;
      } catch (err) {
        console.error("signIn callback error:", err);
        return false;
      }
    },

    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  events: {
    // Seed starter categories for every brand-new user on first sign-in.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.category.createMany({
        data: STARTER_CATEGORIES.map((c) => ({ ...c, userId: user.id! })),
      });
    },
  },
});
