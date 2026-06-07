import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves @/* path aliases defined in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
  },
});
