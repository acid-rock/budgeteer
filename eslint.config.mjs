import next from "eslint-config-next";

// Next 16 ships a native flat config (core-web-vitals + TypeScript rules), so we
// extend it directly rather than via FlatCompat.
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  ...next,
];

export default eslintConfig;
