import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Budgeteer",
  description: "A simple personal finance tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
            <header className="flex flex-col gap-3">
              <h1 className="text-2xl font-bold tracking-tight">💰 Budgeteer</h1>
              <Nav />
            </header>
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
