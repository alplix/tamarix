import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ensureAiSummaryForLocale } from "@/lib/scan-service";
import { translateFinding, type TranslatedFinding } from "@/lib/findings";
import { getLocale } from "@/lib/i18n/get-locale";
import { t } from "@/lib/i18n/translate";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CheckCard } from "@/components/CheckCard";
import { FindingCard } from "@/components/FindingCard";
import type { CheckStatus, Finding, ScanResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();

  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true },
  });

  if (!scan) notFound();

  const aiSummaries = await ensureAiSummaryForLocale(scan, locale);
  const aiOutcome = aiSummaries[locale];

  const raw = scan.rawResult as unknown as ScanResult;

  const findings: Finding[] = scan.findings.map((f) => ({
    category: f.category as Finding["category"],
    severity: f.severity as Finding["severity"],
    titleKey: f.titleKey as Finding["titleKey"],
    titleParams: (f.titleParams as Finding["titleParams"]) ?? undefined,
    descriptionKey: f.descriptionKey as Finding["descriptionKey"],
    descriptionParams: (f.descriptionParams as Finding["descriptionParams"]) ?? undefined,
    recommendationKey: f.recommendationKey as Finding["recommendationKey"],
    recommendationParams: (f.recommendationParams as Finding["recommendationParams"]) ?? undefined,
  }));

  const translated: TranslatedFinding[] = findings.map((f) => translateFinding(locale, f));
  const explanationByTitle = new Map(aiOutcome?.summary?.findingExplanations.map((e) => [e.title, e]) ?? []);

  const severityOrder: Record<TranslatedFinding["severity"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2, PASS: 3 };
  const sortedFindings = [...translated].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const passedHeaders = raw.checks.headers.checks.filter((c) => c.status === "PASS").length;

  const checkCards: Array<{ title: string; status: CheckStatus; detail: string }> = [
    {
      title: t(locale, "category.https"),
      status: scan.httpsStatus as CheckStatus,
      detail: !raw.checks.https.httpsReachable || !raw.checks.https.tlsValid
        ? t(locale, "checkDetail.https.failed")
        : raw.checks.https.httpRedirectsToHttps
          ? t(locale, "checkDetail.https.ok")
          : t(locale, "checkDetail.https.noRedirect"),
    },
    {
      title: t(locale, "category.headers"),
      status: scan.headersStatus as CheckStatus,
      detail: t(locale, "checkDetail.headers", { passed: passedHeaders, total: raw.checks.headers.checks.length }),
    },
    {
      title: t(locale, "category.cookies"),
      status: scan.cookiesStatus as CheckStatus,
      detail:
        raw.checks.cookies.cookieCount === 0
          ? t(locale, "checkDetail.cookies.none")
          : t(locale, "checkDetail.cookies.some", { count: raw.checks.cookies.cookieCount }),
    },
    {
      title: t(locale, "category.infoDisclosure"),
      status: scan.infoDisclosureStatus as CheckStatus,
      detail:
        raw.checks.infoDisclosure.issues.length === 0
          ? t(locale, "checkDetail.infoDisclosure.none")
          : t(locale, "checkDetail.infoDisclosure.some", { count: raw.checks.infoDisclosure.issues.length }),
    },
    {
      title: t(locale, "category.exposure"),
      status: scan.exposureStatus as CheckStatus,
      detail: raw.checks.exposure.securityTxt.found
        ? t(locale, "checkDetail.exposure.found")
        : t(locale, "checkDetail.exposure.missing"),
    },
    {
      title: t(locale, "category.httpMethods"),
      status: scan.httpMethodsStatus as CheckStatus,
      detail:
        raw.checks.httpMethods.allowedMethods.length > 0
          ? t(locale, "checkDetail.httpMethods.some", { methods: raw.checks.httpMethods.allowedMethods.join(", ") })
          : t(locale, "checkDetail.httpMethods.none"),
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            {t(locale, "scan.backLink")}
          </Link>
          <h1 className="mt-2 break-all text-2xl font-semibold">{scan.url}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t(locale, "scan.scannedAt", { date: new Date(scan.createdAt).toLocaleString(locale) })}
          </p>
        </div>
        <ScoreGauge score={scan.score} locale={locale} />
      </div>

      {aiOutcome?.summary?.overview && (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
            {t(locale, "scan.aiSummaryTitle")}
          </h2>
          <p className="text-sm text-[var(--foreground)]">{aiOutcome.summary.overview}</p>
        </div>
      )}
      {!aiOutcome?.summary && aiOutcome?.error && (
        <div className="card border-[var(--warning)]/40 p-5">
          <p className="text-sm text-[var(--muted)]">{t(locale, "scan.aiSummaryUnavailable", { error: aiOutcome.error })}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          {t(locale, "scan.checkResultsTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checkCards.map((card) => (
            <CheckCard key={card.title} {...card} locale={locale} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          {t(locale, "scan.findingsTitle")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sortedFindings.map((finding, i) => (
            <FindingCard key={i} finding={finding} locale={locale} aiExplanation={explanationByTitle.get(finding.title)} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          {t(locale, "scan.scoreBreakdownTitle")}
        </h2>
        <div className="card divide-y divide-[var(--border)]">
          {raw.score.breakdown.map((entry) => (
            <div key={entry.category} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-[var(--foreground)]">{t(locale, `category.${entry.category}`)}</span>
              <span className="text-[var(--muted)]">{t(locale, "scan.pointsLabel", { earned: entry.earned, weight: entry.weight })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
