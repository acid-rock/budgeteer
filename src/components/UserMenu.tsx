import Link from "next/link";
import { auth, signOut } from "@/auth";

// Server component: shows the signed-in user + a sign-out button. Renders
// nothing when logged out, so it's harmless before auth is fully wired.
export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-600">
        {session.user.name ?? session.user.email}
      </span>
      <Link
        href="/settings"
        className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
      >
        Settings
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
