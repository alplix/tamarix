import { Suspense } from "react";
import { ScanForm } from "@/components/ScanForm";
import { RecentScans } from "@/components/RecentScans";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-12 py-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Tamarix</h1>
        <p className="max-w-lg text-balance text-[var(--muted)]">
          Scan your website for common security configuration issues — HTTPS, security headers,
          cookies, and information disclosure — using safe, passive checks only.
        </p>
      </div>

      <ScanForm />

      <Suspense fallback={null}>
        <RecentScans />
      </Suspense>
    </div>
  );
}
