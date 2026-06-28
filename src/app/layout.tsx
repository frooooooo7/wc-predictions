import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { RouteScroll } from "@/components/RouteScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WC 2026 Predictions",
  description:
    "Typuj fazę pucharową Mistrzostw Świata 2026 i śledź drabinkę na żywo ze znajomymi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <RouteScroll />
        <Nav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted">
          Mistrzostwa Świata 2026 · author: froooooooo
        </footer>
      </body>
    </html>
  );
}
