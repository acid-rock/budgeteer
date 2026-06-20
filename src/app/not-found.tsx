import Link from "next/link";

// 404 page, styled with the mint design system. Rendered inside the root layout
// (so the TopBar stays) whenever a route or notFound() has no match.
export default function NotFound() {
  return (
    <div
      className="mint-panel"
      style={{ maxWidth: 480, margin: "48px auto", textAlign: "center" }}
    >
      <h1 style={{ fontSize: 22, marginTop: 0 }}>Page not found</h1>
      <p className="mint-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </p>
      <div style={{ marginTop: 18 }}>
        <Link className="mint-btn pri" href="/">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
