import { prisma } from "./prisma";
import { runScan } from "./scanner";
import { generateAiSummary } from "./ai-summary";
import { validateTargetUrl, normalizeUrl, UnsafeUrlError } from "./url-validation";
import type { Locale } from "./i18n/locales";
import type { CheckStatus, ScanResult } from "./types";
import type { AiSummaryOutcome } from "./ai-summary";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — avoid re-scanning the same URL unnecessarily

export { UnsafeUrlError };

type AiSummaryMap = Record<string, AiSummaryOutcome>;

export async function findRecentScan(normalizedUrl: string) {
  return prisma.scan.findFirst({
    where: {
      normalizedUrl,
      createdAt: { gte: new Date(Date.now() - CACHE_TTL_MS) },
    },
    orderBy: { createdAt: "desc" },
    include: { findings: true },
  });
}

/** Ensures the given scan has an AI summary cached for `locale`, generating (and persisting) one only if missing. */
export async function ensureAiSummaryForLocale<T extends { id: string; url: string; aiSummaries: unknown; rawResult: unknown }>(
  scan: T,
  locale: Locale
): Promise<AiSummaryMap> {
  const existing = ((scan.aiSummaries as AiSummaryMap | null) ?? {}) as AiSummaryMap;
  if (existing[locale]) return existing;

  const raw = scan.rawResult as unknown as ScanResult;
  const outcome = await generateAiSummary(scan.url, raw.score, raw.findings, locale);

  const updated: AiSummaryMap = { ...existing, [locale]: outcome };
  await prisma.scan.update({
    where: { id: scan.id },
    data: { aiSummaries: JSON.parse(JSON.stringify(updated)) },
  });

  return updated;
}

export async function performScan(rawUrl: string, locale: Locale, force: boolean) {
  const { url } = await validateTargetUrl(rawUrl);
  const normalized = normalizeUrl(url);

  if (!force) {
    const cached = await findRecentScan(normalized);
    if (cached) {
      const aiSummaries = await ensureAiSummaryForLocale(cached, locale);
      return { scan: { ...cached, aiSummaries }, cached: true as const };
    }
  }

  const result: ScanResult = await runScan(rawUrl);
  const aiOutcome = await generateAiSummary(result.url, result.score, result.findings, locale);
  const aiSummaries: AiSummaryMap = { [locale]: aiOutcome };

  const scan = await prisma.scan.create({
    data: {
      url: result.url,
      normalizedUrl: result.normalizedUrl,
      score: result.score.score,
      httpsStatus: result.checks.https.status as CheckStatus,
      headersStatus: result.checks.headers.status as CheckStatus,
      cookiesStatus: result.checks.cookies.status as CheckStatus,
      infoDisclosureStatus: result.checks.infoDisclosure.status as CheckStatus,
      exposureStatus: result.checks.exposure.status as CheckStatus,
      httpMethodsStatus: result.checks.httpMethods.status as CheckStatus,
      rawResult: JSON.parse(JSON.stringify(result)),
      aiSummaries: JSON.parse(JSON.stringify(aiSummaries)),
      findings: {
        create: result.findings.map((f) => ({
          category: f.category,
          severity: f.severity,
          titleKey: f.titleKey,
          titleParams: f.titleParams ? JSON.parse(JSON.stringify(f.titleParams)) : undefined,
          descriptionKey: f.descriptionKey,
          descriptionParams: f.descriptionParams ? JSON.parse(JSON.stringify(f.descriptionParams)) : undefined,
          recommendationKey: f.recommendationKey,
          recommendationParams: f.recommendationParams ? JSON.parse(JSON.stringify(f.recommendationParams)) : undefined,
        })),
      },
    },
    include: { findings: true },
  });

  return { scan: { ...scan, aiSummaries }, cached: false as const };
}
