"use client";

import { useEffect } from "react";

// Registers the service worker that backs PWA installability + the offline shell.
// Production-only: a custom SW caching /_next/static during `next dev` fights with
// hot-module reloading, so we skip it in development.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app still works online.
      });
    };

    // Wait for load so SW registration doesn't compete with initial page work.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
