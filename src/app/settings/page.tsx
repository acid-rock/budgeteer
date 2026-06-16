import { auth, signIn, signOut } from "@/auth";
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
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="mint-head">
        <div>
          <h1>Account settings</h1>
          <p>Manage your profile and connected sign-in providers.</p>
        </div>
      </div>

      {params.linked && (
        <div
          className="mint-panel"
          style={{
            background: "rgba(14,138,80,0.08)",
            borderColor: "rgba(14,138,80,0.3)",
            color: "var(--pos)",
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {params.linked} account connected successfully.
        </div>
      )}

      {/* Profile card */}
      <section
        className="mint-panel"
        style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}
      >
        {user.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? ""}
            style={{ height: 48, width: 48, borderRadius: "50%" }}
          />
        )}
        <div>
          <p style={{ fontWeight: 600 }}>{user.name ?? "—"}</p>
          <p className="mint-muted" style={{ fontSize: 13 }}>{user.email}</p>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            Member since {memberSince}
          </p>
        </div>
      </section>

      {/* Connected providers */}
      <section className="mint-panel" style={{ marginBottom: 16 }}>
        <div className="mint-ph">
          <h3>Sign-in providers</h3>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {PROVIDERS.map(({ id, label }) => {
            const connected = connectedProviders.has(id);
            return (
              <li key={id} className="mint-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  {connected && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 999,
                        background: "rgba(14,138,80,0.12)",
                        color: "var(--pos)",
                      }}
                    >
                      Connected
                    </span>
                  )}
                </div>
                {!connected && (
                  <form action={connectProvider} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="provider" value={id} />
                    <button type="submit" className="mint-btn">
                      Connect
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="mint-btn danger">
          Sign out
        </button>
      </form>
    </div>
  );
}
