import { describe, it, expect } from "vitest";
import { buildCsp } from "@/lib/csp";

function directive(csp: string, name: string): string {
  return (
    csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith(name + " ")) ?? ""
  );
}

describe("buildCsp", () => {
  it("locks script-src to the nonce + strict-dynamic with no unsafe-* in production", () => {
    const csp = buildCsp("ABC123", { dev: false });
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toBe("script-src 'self' 'nonce-ABC123' 'strict-dynamic'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("keeps unsafe-inline/eval in development (HMR uses eval)", () => {
    const scriptSrc = directive(buildCsp("ABC123", { dev: true }), "script-src");
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("nonce-");
  });

  it("keeps the shared hardening directives in both modes", () => {
    for (const dev of [true, false]) {
      const csp = buildCsp("N", { dev });
      expect(csp).toContain("default-src 'self'");
      // style-src deliberately retains unsafe-inline (Recharts/next-font styles).
      expect(directive(csp, "style-src")).toBe("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("form-action 'self'");
    }
  });
});
