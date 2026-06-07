import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { APP_TIME_ZONE } from "@/lib/utils";

const PROVIDERS = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
] as const;

// Server action: stores the current userId in a short-lived cookie so the
// signIn callback in auth.ts knows this OAuth flow is a linking request,
// then kicks off the provider's OAuth flow.
async function connectProvider(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const provider = formData.get("provider") as string;
  const cookieStore = await cookies();

  cookieStore.set("budgeteer_link_user_id", session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 300, // 5 minutes — enough to complete the OAuth round-trip
    sameSite: "lax",
    path: "/",
  });

  await signIn(provider, { redirectTo: "/settings" });
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linked?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  const [user, accounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, image: true, createdAt: true },
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    }),
  ]);

  if (!user) redirect("/login");

  const connectedProviders = new Set(accounts.map((a) => a.provider));
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-PH", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "long",
  });

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Account Settings</h2>
        <p className="text-sm text-slate-500">
          Manage your profile and connected sign-in providers.
        </p>
      </div>

      {params.linked && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {params.linked} account connected successfully.
        </div>
      )}

      {/* Profile card */}
      <section className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="h-12 w-12 rounded-full"
          />
        )}
        <div>
          <p className="font-medium">{user.name ?? "—"}</p>
          <p className="text-sm text-slate-500">{user.email}</p>
          <p className="text-xs text-slate-400">Member since {memberSince}</p>
        </div>
      </section>

      {/* Connected providers */}
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Sign-in providers</h3>
        <ul className="divide-y divide-slate-100">
          {PROVIDERS.map(({ id, label }) => {
            const connected = connectedProviders.has(id);
            return (
              <li
                key={id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{label}</span>
                  {connected && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Connected
                    </span>
                  )}
                </div>
                {!connected && (
                  <form action={connectProvider}>
                    <input type="hidden" name="provider" value={id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Connect
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
