import { safeFetch } from "../safe-fetch";
import type { HttpMethodsCheckResult } from "../types";

const DANGEROUS_METHODS = ["PUT", "DELETE", "TRACE", "CONNECT"];

/**
 * Sends a single passive OPTIONS request to read the Allow header. Never sends
 * the dangerous methods themselves — only checks whether the server advertises them.
 */
export async function checkHttpMethods(targetUrl: URL): Promise<HttpMethodsCheckResult> {
  try {
    const result = await safeFetch(targetUrl.toString(), { method: "OPTIONS", readBody: false, timeoutMs: 5000 });
    const allowHeader = result.response.headers.get("allow");
    const allowedMethods = allowHeader
      ? allowHeader.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean)
      : [];

    const exposedDangerous = allowedMethods.filter((m) => DANGEROUS_METHODS.includes(m));
    const issues = exposedDangerous.map(
      (m) => `Sunucu ${m} metoduna izin verdiğini bildiriyor.`
    );

    const status = exposedDangerous.length > 0 ? "WARNING" : "PASS";
    return { status, allowedMethods, issues };
  } catch {
    return { status: "PASS", allowedMethods: [], issues: [] };
  }
}
