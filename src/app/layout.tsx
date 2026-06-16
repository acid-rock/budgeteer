import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TopBar } from "@/components/TopBar";
import { auth } from "@/auth";
import { APP_TIME_ZONE } from "@/lib/utils";

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
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Providers>
          <div className="mint">
            {session?.user ? (
              <>
                <TopBar
                  month={monthLabel}
                  initials={initialsFor(session.user.name, session.user.email)}
                />
                <main className="mint-page">{children}</main>
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
