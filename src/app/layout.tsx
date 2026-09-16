import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Tamarix — Website Security Scanner",
  description: "Scan your website for common security configuration issues.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
