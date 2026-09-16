import { safeFetch } from "../safe-fetch";
import type { ExposureCheckResult } from "../types";

async function checkFileExists(baseUrl: URL, path: string): Promise<{ found: boolean; url: string }> {
  const fileUrl = new URL(path, baseUrl).toString();
  try {
    const result = await safeFetch(fileUrl, { method: "GET", readBody: false, timeoutMs: 5000 });
    return { found: result.response.status >= 200 && result.response.status < 300, url: fileUrl };
  } catch {
    return { found: false, url: fileUrl };
  }
}

/**
 * Checks for a small, fixed set of well-known, publicly-intended files
 * (robots.txt, sitemap.xml, security.txt) — never enumerates or brute-forces paths.
 */
export async function checkExposure(targetUrl: URL): Promise<ExposureCheckResult> {
  const [robotsTxt, sitemapXml, securityTxt] = await Promise.all([
    checkFileExists(targetUrl, "/robots.txt"),
    checkFileExists(targetUrl, "/sitemap.xml"),
    checkFileExists(targetUrl, "/.well-known/security.txt"),
  ]);

  const status = securityTxt.found ? "PASS" : "WARNING";

  return { status, robotsTxt, sitemapXml, securityTxt };
}
