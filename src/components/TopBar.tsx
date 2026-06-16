"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/categories", label: "Categories" },
  { href: "/reports", label: "Reports" },
];

export function TopBar({
  month,
  initials,
}: {
  month: string;
  initials: string;
}) {
  const pathname = usePathname();

  return (
    <header className="mint-top">
      <div className="mint-top-inner">
        <Link href="/" className="mint-brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="mint-tile">
            <b>B</b>
            <i />
          </div>
          <span className="mint-word">Budgeteer</span>
        </Link>
        <nav className="mint-nav">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "on" : ""}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mint-right">
          {/* TODO: the month pill is display-only for now — the caret implies a
              dropdown but nothing is wired up. Either make it switch the active
              month (Dashboard currently derives "this month" server-side) or
              drop the caret. Hidden on phones via CSS until then. */}
          <div className="mint-month">
            {month} <span style={{ opacity: 0.5 }}>&#9662;</span>
          </div>
          <Link
            href="/settings"
            className="mint-avatar"
            style={{ textDecoration: "none" }}
            title="Settings"
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
