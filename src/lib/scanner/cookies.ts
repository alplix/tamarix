import type { CookieCheck, CookieIssueCode, CookiesCheckResult } from "../types";

/**
 * Parses individual Set-Cookie header values (each string is already one full
 * cookie — obtain these via `response.headers.getSetCookie()`, never `.get()`,
 * since `.get()` joins multiple Set-Cookie headers with commas and corrupts them).
 */
export function parseCookies(setCookieHeaders: string[]): CookieCheck[] {
  return setCookieHeaders.map((cookieStr) => {
    const attrs = cookieStr.split(";").map((s) => s.trim());
    const [nameValue, ...rest] = attrs;
    const name = nameValue.split("=")[0]?.trim() || "(unknown)";

    const secure = rest.some((a) => a.toLowerCase() === "secure");
    const httpOnly = rest.some((a) => a.toLowerCase() === "httponly");
    const sameSiteAttr = rest.find((a) => a.toLowerCase().startsWith("samesite"));
    const sameSite = sameSiteAttr ? sameSiteAttr.split("=")[1]?.trim() ?? null : null;

    const issues: CookieIssueCode[] = [];
    if (!secure) issues.push("missingSecure");
    if (!httpOnly) issues.push("missingHttpOnly");
    if (!sameSite) {
      issues.push("missingSameSite");
    } else if (sameSite.toLowerCase() === "none" && !secure) {
      issues.push("sameSiteNoneNoSecure");
    }

    return { name, secure, httpOnly, sameSite, issues };
  });
}

export function checkCookies(setCookieHeaders: string[]): CookiesCheckResult {
  const cookies = parseCookies(setCookieHeaders);

  if (cookies.length === 0) {
    return { status: "PASS", cookies, cookieCount: 0 };
  }

  const hasCriticalIssue = cookies.some((c) => !c.secure || !c.httpOnly);
  const hasAnyIssue = cookies.some((c) => c.issues.length > 0);

  const status = hasCriticalIssue || hasAnyIssue ? "WARNING" : "PASS";

  return { status, cookies, cookieCount: cookies.length };
}
