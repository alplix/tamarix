import type { CheckStatus, HeaderCheck, HeadersCheckResult } from "../types";

function evaluateCsp(value: string | null): HeaderCheck {
  if (!value) {
    return { headerKey: "csp", header: "Content-Security-Policy", status: "FAIL", value: null, reasonCode: "csp.missing" };
  }
  const lower = value.toLowerCase();
  if (lower.includes("unsafe-inline") || lower.includes("unsafe-eval") || /default-src[^;]*\*/.test(lower)) {
    return { headerKey: "csp", header: "Content-Security-Policy", status: "WARNING", value, reasonCode: "csp.weak" };
  }
  return { headerKey: "csp", header: "Content-Security-Policy", status: "PASS", value, reasonCode: "csp.pass" };
}

function evaluateHsts(value: string | null, isHttps: boolean): HeaderCheck {
  const header = "Strict-Transport-Security";
  if (!isHttps) {
    return { headerKey: "hsts", header, status: "WARNING", value, reasonCode: "hsts.noHttps" };
  }
  if (!value) {
    return { headerKey: "hsts", header, status: "FAIL", value: null, reasonCode: "hsts.missing" };
  }
  const maxAgeMatch = value.match(/max-age=(\d+)/i);
  const maxAge = maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : 0;
  if (maxAge < 15552000) {
    // < 180 days
    return { headerKey: "hsts", header, status: "WARNING", value, reasonCode: "hsts.weak" };
  }
  return { headerKey: "hsts", header, status: "PASS", value, reasonCode: "hsts.pass" };
}

function evaluateXContentTypeOptions(value: string | null): HeaderCheck {
  const header = "X-Content-Type-Options";
  if (!value) {
    return { headerKey: "xcto", header, status: "FAIL", value: null, reasonCode: "xcto.missing" };
  }
  if (value.toLowerCase().trim() !== "nosniff") {
    return { headerKey: "xcto", header, status: "WARNING", value, reasonCode: "xcto.weak" };
  }
  return { headerKey: "xcto", header, status: "PASS", value, reasonCode: "xcto.pass" };
}

function evaluateXFrameOptions(value: string | null, csp: string | null): HeaderCheck {
  const header = "X-Frame-Options";
  const cspHasFrameAncestors = csp?.toLowerCase().includes("frame-ancestors") ?? false;
  if (!value) {
    if (cspHasFrameAncestors) {
      return { headerKey: "xfo", header, status: "PASS", value: null, reasonCode: "xfo.passViaCsp" };
    }
    return { headerKey: "xfo", header, status: "FAIL", value: null, reasonCode: "xfo.missingNoCsp" };
  }
  const normalized = value.toLowerCase().trim();
  if (normalized !== "deny" && normalized !== "sameorigin") {
    return { headerKey: "xfo", header, status: "WARNING", value, reasonCode: "xfo.weak" };
  }
  return { headerKey: "xfo", header, status: "PASS", value, reasonCode: "xfo.pass" };
}

function evaluateReferrerPolicy(value: string | null): HeaderCheck {
  const header = "Referrer-Policy";
  if (!value) {
    return { headerKey: "referrer", header, status: "WARNING", value: null, reasonCode: "referrer.missing" };
  }
  if (value.toLowerCase().trim() === "unsafe-url") {
    return { headerKey: "referrer", header, status: "WARNING", value, reasonCode: "referrer.weak" };
  }
  return { headerKey: "referrer", header, status: "PASS", value, reasonCode: "referrer.pass" };
}

function evaluatePermissionsPolicy(value: string | null): HeaderCheck {
  const header = "Permissions-Policy";
  if (!value) {
    return { headerKey: "permissions", header, status: "WARNING", value: null, reasonCode: "permissions.missing" };
  }
  return { headerKey: "permissions", header, status: "PASS", value, reasonCode: "permissions.pass" };
}

export function checkSecurityHeaders(headers: Headers, isHttps: boolean): HeadersCheckResult {
  const csp = headers.get("content-security-policy");

  const checks: HeaderCheck[] = [
    evaluateCsp(csp),
    evaluateHsts(headers.get("strict-transport-security"), isHttps),
    evaluateXContentTypeOptions(headers.get("x-content-type-options")),
    evaluateXFrameOptions(headers.get("x-frame-options"), csp),
    evaluateReferrerPolicy(headers.get("referrer-policy")),
    evaluatePermissionsPolicy(headers.get("permissions-policy")),
  ];

  const status: CheckStatus = checks.some((c) => c.status === "FAIL")
    ? "FAIL"
    : checks.some((c) => c.status === "WARNING")
      ? "WARNING"
      : "PASS";

  return { status, checks };
}
