"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

// Route-segment error boundary. Catches render/runtime errors below the root
// layout (the TopBar + page chrome stay mounted around this). Never shows the
// raw error message/stack to the user — only a friendly note and a retry.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Route segment error boundary", error);
  }, [error]);

  return (
    <div
      className="mint-panel"
      style={{ maxWidth: 480, margin: "48px auto", textAlign: "center" }}
    >
      <h1 style={{ fontSize: 22, marginTop: 0 }}>Something went wrong</h1>
      <p className="mint-muted">
        An unexpected error occurred while loading this page. You can try again —
        if it keeps happening, please check back in a little while.
      </p>
      {error.digest && (
        <p className="mint-muted" style={{ fontSize: 12 }}>
          Reference: {error.digest}
        </p>
      )}
      <div
        style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}
      >
        <button className="mint-btn pri" onClick={reset}>
          Try again
        </button>
        <a className="mint-btn" href="/">
          Go to dashboard
        </a>
      </div>
    </div>
  );
}
