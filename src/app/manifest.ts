import type { MetadataRoute } from "next";

// Web App Manifest (served at /manifest.webmanifest) — makes Budgeteer
// installable to a phone home screen and launchable standalone. The "Quick add"
// shortcut deep-links to the dashboard with ?quickadd=1, which the QuickAdd
// component opens on load (see src/components/QuickAdd.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Budgeteer",
    short_name: "Budgeteer",
    description: "A simple personal finance tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6f0",
    theme_color: "#0e5a3c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Quick add transaction",
        short_name: "Quick add",
        description: "Log an expense or income",
        url: "/?quickadd=1",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
