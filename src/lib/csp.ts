// Builds the Content-Security-Policy string. Used per-request by the middleware,
// which supplies a fresh nonce so Next's inline bootstrap scripts are allowed
// without 'unsafe-inline'. Pure + edge-safe (string only).
//
// script-src: production locks to the nonce + 'strict-dynamic' (the nonced
// bootstrap is trusted to load the same-origin chunks) with NO 'unsafe-inline'
// or 'unsafe-eval'. Development keeps them because `next dev` uses eval for HMR
// and injects inline scripts that aren't nonced.
//
// style-src: keeps 'unsafe-inline'. Next's font <style> and Recharts' inline
// style attributes can't carry a nonce (nonces don't apply to style attributes),
// so this stays — script-src is where the meaningful XSS hardening happens.
export function buildCsp(nonce: string, options?: { dev?: boolean }): string {
  const dev = options?.dev ?? process.env.NODE_ENV !== "production";

  const scriptSrc = dev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return (
    [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline'",
      // Avatars come from GitHub/Google over https; data: covers inline SVG/icons.
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ") + ";"
  );
}
