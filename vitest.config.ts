import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves @/* path aliases defined in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Deterministic placeholder env so importing src/lib/env.ts (which validates
    // and parses process.env at module load) is safe in tests, independent of any
    // local .env. Not secrets — only the required vars the env schema checks.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "test-secret",
      AUTH_GITHUB_ID: "test-id",
      AUTH_GITHUB_SECRET: "test-secret",
      AUTH_GOOGLE_ID: "test-id",
      AUTH_GOOGLE_SECRET: "test-secret",
    },
  },
});
