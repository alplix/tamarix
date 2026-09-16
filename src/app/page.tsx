import { Suspense } from "react";
import { ScanForm } from "@/components/ScanForm";
import { RecentScans } from "@/components/RecentScans";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

export default async function Home() {
  const locale = await getLocale();

  return (
    <div className="flex flex-col items-center gap-12 py-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Tamarix</h1>
        <p className="max-w-lg text-balance text-[var(--muted)]">{t(locale, "home.tagline")}</p>
      </div>

      <ScanForm />

      <Suspense fallback={null}>
        <RecentScans locale={locale} />
      </Suspense>
    </div>
  );
}
