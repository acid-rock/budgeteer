// Next.js instrumentation hook — runs once when a server process starts. We
// import the env module here so environment validation runs at boot: a missing
// or blank required var throws a clear error immediately, instead of failing
// deep inside the first request that needs it.
export async function register() {
  // Only the Node.js runtime needs (and can fully see) the server env; the edge
  // runtime is intentionally excluded, matching the env module's Node-only scope.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/env");
  }
}
