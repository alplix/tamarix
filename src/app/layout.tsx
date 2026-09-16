import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n/context";
import { getLocale } from "@/lib/i18n/get-locale";

export const metadata: Metadata = {
  title: "Tamarix — Website Security Scanner",
  description: "Scan your website for common security configuration issues.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body className="antialiased flex min-h-screen flex-col">
        <I18nProvider locale={locale}>
          <Header />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6">{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
