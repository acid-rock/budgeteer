import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Edge-safe Auth.js config: providers + callbacks only, NO database adapter.
// Imported by middleware (edge runtime) and merged into the full config in
// auth.ts. Reads AUTH_GITHUB_* and AUTH_GOOGLE_* from env.
//
export const authConfig = {
  providers: [GitHub, Google],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Used as middleware route-guard: false → redirect to signIn page.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
