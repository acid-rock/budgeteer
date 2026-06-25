import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { QuickAdd } from "@/components/QuickAdd";
import { auth } from "@/auth";
import { dateToMonthString } from "@/lib/utils";
import { getTransactionMonths } from "@/lib/dashboard-data";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "Budgeteer",
  description: "A simple personal finance tracker",
};

function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "U";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const currentMonth = dateToMonthString();

  // Months the switcher offers: every month with data, plus the current month so
  // it's always selectable (e.g. a brand-new user with no transactions yet).
  const monthOptions = session?.user?.id
    ? [...new Set([currentMonth, ...(await getTransactionMonths(session.user.id))])]
        .sort()
        .reverse()
    : [currentMonth];

  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Providers>
          <div className="mint">
            {session?.user ? (
              <>
                <TopBar
                  currentMonth={currentMonth}
                  months={monthOptions}
                  initials={initialsFor(session.user.name, session.user.email)}
                />
                <main className="mint-page">{children}</main>
                <QuickAdd />
              </>
            ) : (
              <main>{children}</main>
            )}
          </div>
        </Providers>
      </body>
    </html>
  );
}
