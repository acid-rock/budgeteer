"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";

// Last-resort boundary: catches errors thrown in the root layout itself. It
// REPLACES the root layout, so it must render its own <html>/<body> and cannot
// rely on globals.css or the .mint classes — styles are inlined with the
// Sprout palette so it still looks on-brand.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Global error boundary", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F3F6F0",
          color: "#14241B",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "#FFFFFF",
            border: "1px solid #E3E9DE",
            borderRadius: 18,
            padding: 28,
            textAlign: "center",
            boxShadow: "0 18px 40px rgba(14, 90, 60, 0.10)",
          }}
        >
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#62756a", margin: "0 0 18px", lineHeight: 1.5 }}>
            The app hit an unexpected error. Please try again — if it keeps
            happening, check back shortly.
          </p>
          {error.digest && (
            <p style={{ color: "#62756a", fontSize: 12, margin: "0 0 18px" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              background: "#0E5A3C",
              color: "#FFFFFF",
              fontWeight: 600,
              fontSize: 14,
              padding: "10px 20px",
              borderRadius: 999,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
