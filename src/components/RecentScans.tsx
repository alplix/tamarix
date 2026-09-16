import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/locales";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warning)";
  return "var(--fail)";
}

export async function RecentScans({ locale }: { locale: Locale }) {
  let scans: Array<{ id: string; url: string; score: number }> = [];
  try {
    scans = await prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, url: true, score: true },
    });
  } catch {
    return null;
  }

  if (scans.length === 0) return null;

  return (
    <div className="w-full max-w-3xl">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        {t(locale, "home.recentScans")}
      </h2>
      <div className="card divide-y divide-[var(--border)]">
        {scans.map((scan) => (
          <Link
            key={scan.id}
            href={`/scan/${scan.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-[var(--surface-raised)]"
          >
            <span className="truncate text-[var(--foreground)]">{scan.url}</span>
            <span className="ml-4 shrink-0 font-semibold" style={{ color: scoreColor(scan.score) }}>
              {scan.score}/100
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
