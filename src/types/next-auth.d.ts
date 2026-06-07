import type { DefaultSession } from "next-auth";

// Add the DB user id onto the session + token so the app can scope data per user.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}
