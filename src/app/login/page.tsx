import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  const params = await searchParams;
  const isProviderConflict = params.error === "AccountExistsWithDifferentProvider";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="mint-panel"
        style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}
      >
        <div className="mint-brand" style={{ justifyContent: "center" }}>
          <div className="mint-tile">
            <b>B</b>
            <i />
          </div>
          <span className="mint-word">Budgeteer</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Sign in to Budgeteer</h1>
          <p className="mint-muted" style={{ marginTop: 4 }}>
            Choose a sign-in method to continue.
          </p>
        </div>

        {isProviderConflict && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(216,85,60,0.3)",
              background: "rgba(216,85,60,0.08)",
              padding: 14,
              fontSize: 13,
              color: "var(--neg)",
            }}
          >
            <p style={{ fontWeight: 700, margin: 0 }}>Account already exists</p>
            <p style={{ marginTop: 4 }}>
              This email is registered with{" "}
              <span style={{ fontWeight: 700, textTransform: "capitalize" }}>
                {params.provider ?? "another provider"}
              </span>
              . Sign in with that provider first, then connect additional ones
              from Settings.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mint-btn pri"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Sign in with GitHub
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="mint-btn"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Sign in with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
