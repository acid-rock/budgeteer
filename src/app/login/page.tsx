import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; provider?: string }>;
}) {
  const params = await searchParams;
  const isProviderConflict = params.error === "AccountExistsWithDifferentProvider";

  return (
    <div className="mx-auto mt-10 flex max-w-sm flex-col gap-6 rounded-lg border border-slate-200 bg-white p-6">
      <div>
        <h2 className="text-lg font-semibold">Sign in to Budgeteer</h2>
        <p className="text-sm text-slate-500">
          Choose a sign-in method to continue.
        </p>
      </div>

      {isProviderConflict && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Account already exists</p>
          <p className="mt-1">
            This email is registered with{" "}
            <span className="font-medium capitalize">{params.provider ?? "another provider"}</span>.
            Sign in with that provider first, then connect additional ones from{" "}
            <span className="font-medium">Settings</span>.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
            className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
