"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/budgets", label: "Budgets" },
  { href: "/categories", label: "Categories" },
  { href: "/reports", label: "Reports" },
];

function isValidMonth(v: string | null): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// "2026-06" → "June 2026". Formatted in UTC so the label never shifts a month
// across the timezone boundary.
function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function TopBar({
  currentMonth,
  months,
  initials,
}: {
  currentMonth: string;
  months: string[];
  initials: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const paramMonth = searchParams.get("month");
  const activeMonth = isValidMonth(paramMonth) ? paramMonth : currentMonth;

  // Render the data-bearing months from the server, but always surface the
  // active month even if it has no data (e.g. a hand-edited ?month= URL).
  const menuMonths = [...new Set([activeMonth, ...months])].sort().reverse();

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectMonth(month: string) {
    setOpen(false);
    // The dashboard reads ?month= to scope its monthly panels. Current month
    // gets a clean URL; any other month is carried as a query param.
    router.push(month === currentMonth ? "/" : `/?month=${month}`);
  }

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
          <div className="mint-monthwrap" ref={wrapRef}>
            <button
              type="button"
              className="mint-month"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {monthLabel(activeMonth)}{" "}
              <span style={{ opacity: 0.5 }}>&#9662;</span>
            </button>
            {open && (
              <div className="mint-monthmenu" role="listbox">
                {menuMonths.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={m === activeMonth}
                    className={m === activeMonth ? "on" : ""}
                    onClick={() => selectMonth(m)}
                  >
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
            )}
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
