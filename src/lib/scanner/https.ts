import { safeFetch } from "../safe-fetch";
import type { HttpsCheckResult } from "../types";

export async function checkHttps(targetUrl: URL): Promise<HttpsCheckResult> {
  const details: string[] = [];
  let httpsReachable = false;
  let tlsValid = false;
  let httpRedirectsToHttps = false;
  let finalUrl: string | null = null;

  const httpsUrl = new URL(targetUrl.toString());
  httpsUrl.protocol = "https:";

  try {
    const result = await safeFetch(httpsUrl.toString(), { method: "GET", readBody: false });
    httpsReachable = true;
    tlsValid = true;
    finalUrl = result.finalUrl;
    details.push(`HTTPS bağlantısı başarılı (HTTP ${result.response.status}).`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bilinmeyen hata";
    details.push(`HTTPS bağlantısı kurulamadı: ${message}`);
  }

  if (targetUrl.protocol === "http:") {
    const httpUrl = new URL(targetUrl.toString());
    httpUrl.protocol = "http:";
    try {
      const result = await safeFetch(httpUrl.toString(), { method: "GET", readBody: false });
      httpRedirectsToHttps = result.finalUrl.startsWith("https://");
      details.push(
        httpRedirectsToHttps
          ? "HTTP isteği HTTPS'e yönlendiriliyor."
          : "HTTP isteği HTTPS'e yönlendirilmiyor."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "bilinmeyen hata";
      details.push(`HTTP bağlantısı test edilemedi: ${message}`);
    }
  } else {
    // Target was already https:// — separately verify the http:// origin redirects onward.
    const httpUrl = new URL(targetUrl.toString());
    httpUrl.protocol = "http:";
    try {
      const result = await safeFetch(httpUrl.toString(), { method: "GET", readBody: false });
      httpRedirectsToHttps = result.finalUrl.startsWith("https://");
      details.push(
        httpRedirectsToHttps
          ? "HTTP isteği HTTPS'e yönlendiriliyor."
          : "HTTP isteği HTTPS'e yönlendirilmiyor."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "bilinmeyen hata";
      details.push(`HTTP kaynağı test edilemedi (önemli değil): ${message}`);
    }
  }

  let status: HttpsCheckResult["status"];
  if (httpsReachable && tlsValid && httpRedirectsToHttps) {
    status = "PASS";
  } else if (httpsReachable && tlsValid) {
    status = "WARNING";
  } else {
    status = "FAIL";
  }

  return { status, httpsReachable, httpRedirectsToHttps, tlsValid, finalUrl, details };
}
