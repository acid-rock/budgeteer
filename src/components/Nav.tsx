"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reports", label: "Reports" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
