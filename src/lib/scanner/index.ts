import { safeFetch } from "../safe-fetch";
import { normalizeUrl, validateTargetUrl } from "../url-validation";
import { buildFindings } from "../findings";
import { computeScore } from "../scoring";
import type { ScanChecks, ScanResult } from "../types";
import { checkHttps } from "./https";
import { checkSecurityHeaders } from "./headers";
import { checkCookies } from "./cookies";
import { checkInformationDisclosure } from "./information-disclosure";
import { checkExposure } from "./exposure";
import { checkHttpMethods } from "./http-methods";

/** Upper bound on total wall-clock time for a single scan, across every request it makes. */
export const SCAN_BUDGET_MS = 45_000;

export async function runScan(rawUrl: string): Promise<ScanResult> {
  return Promise.race([
    runScanUnbounded(rawUrl),
    new Promise<ScanResult>((_, reject) =>
      setTimeout(() => reject(new Error("Tarama zaman aşımına uğradı (site çok yavaş yanıt veriyor).")), SCAN_BUDGET_MS)
    ),
  ]);
}

async function runScanUnbounded(rawUrl: string): Promise<ScanResult> {
  const { url } = await validateTargetUrl(rawUrl);

  const mainResult = await safeFetch(url.toString(), { method: "GET" });
  const isHttps = mainResult.finalUrl.startsWith("https://");
  const finalUrl = new URL(mainResult.finalUrl);

  const [https, exposure, httpMethods] = await Promise.all([
    checkHttps(url),
    checkExposure(finalUrl),
    checkHttpMethods(finalUrl),
  ]);

  const headers = checkSecurityHeaders(mainResult.response.headers, isHttps);
  const setCookieHeaders =
    typeof mainResult.response.headers.getSetCookie === "function"
      ? mainResult.response.headers.getSetCookie()
      : [];
  const cookies = checkCookies(setCookieHeaders);
  const infoDisclosure = checkInformationDisclosure(mainResult.response.headers, mainResult.bodyText);

  const checks: ScanChecks = { https, headers, cookies, infoDisclosure, exposure, httpMethods };
  const findings = buildFindings(checks);
  const score = computeScore(checks);

  return {
    url: rawUrl,
    normalizedUrl: normalizeUrl(url),
    scannedAt: new Date().toISOString(),
    checks,
    findings,
    score,
  };
}
