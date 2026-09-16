import { prisma } from "./prisma";
import { runScan } from "./scanner";
import { generateAiSummary } from "./ai-summary";
import { validateTargetUrl, normalizeUrl, UnsafeUrlError } from "./url-validation";
import type { CheckStatus, ScanResult } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — avoid re-scanning + re-calling the AI for the same URL

export class ScanTimeoutError extends Error {}
export class ScanUnreachableError extends Error {}

export { UnsafeUrlError };

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

export async function performScan(rawUrl: string, force: boolean) {
  const { url } = await validateTargetUrl(rawUrl);
  const normalized = normalizeUrl(url);

  if (!force) {
    const cached = await findRecentScan(normalized);
    if (cached) return { scan: cached, cached: true as const };
  }

  let result: ScanResult;
  try {
    result = await runScan(rawUrl);
  } catch (err) {
    if (err instanceof UnsafeUrlError) throw err;
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    if (message.includes("zaman aşımı")) throw new ScanTimeoutError(message);
    throw new ScanUnreachableError(message);
  }

  const aiOutcome = await generateAiSummary(rawUrl, result.score, result.findings);

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
      aiSummary: aiOutcome.summary ? JSON.parse(JSON.stringify(aiOutcome.summary)) : undefined,
      aiSummaryError: aiOutcome.error ?? undefined,
      findings: {
        create: result.findings.map((f) => ({
          category: f.category,
          severity: f.severity,
          title: f.title,
          description: f.description,
          recommendation: f.recommendation,
        })),
      },
    },
    include: { findings: true },
  });

  return { scan, cached: false as const };
}
