import { safeFetch } from "../safe-fetch";
import type { HttpsCheckResult } from "../types";

export async function checkHttps(targetUrl: URL): Promise<HttpsCheckResult> {
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
  } catch {
    // httpsReachable stays false
  }

  const httpUrl = new URL(targetUrl.toString());
  httpUrl.protocol = "http:";
  try {
    const result = await safeFetch(httpUrl.toString(), { method: "GET", readBody: false });
    httpRedirectsToHttps = result.finalUrl.startsWith("https://");
  } catch {
    // leave httpRedirectsToHttps as false; not fatal on its own
  }

  let status: HttpsCheckResult["status"];
  if (httpsReachable && tlsValid && httpRedirectsToHttps) {
    status = "PASS";
  } else if (httpsReachable && tlsValid) {
    status = "WARNING";
  } else {
    status = "FAIL";
  }

  return { status, httpsReachable, httpRedirectsToHttps, tlsValid, finalUrl };
}
