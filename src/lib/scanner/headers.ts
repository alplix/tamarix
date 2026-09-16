import type { CheckStatus, HeaderCheck, HeadersCheckResult } from "../types";

function evaluateCsp(value: string | null): HeaderCheck {
  if (!value) {
    return { header: "Content-Security-Policy", status: "FAIL", value: null, reason: "Header bulunamadı." };
  }
  const lower = value.toLowerCase();
  if (lower.includes("unsafe-inline") || lower.includes("unsafe-eval") || /default-src[^;]*\*/.test(lower)) {
    return {
      header: "Content-Security-Policy",
      status: "WARNING",
      value,
      reason: "Politika mevcut ancak 'unsafe-inline', 'unsafe-eval' veya joker (*) kaynak izinleri zayıflatıyor.",
    };
  }
  return { header: "Content-Security-Policy", status: "PASS", value, reason: "Header mevcut ve makul şekilde yapılandırılmış." };
}

function evaluateHsts(value: string | null, isHttps: boolean): HeaderCheck {
  if (!isHttps) {
    return {
      header: "Strict-Transport-Security",
      status: "WARNING",
      value,
      reason: "Site HTTPS kullanmıyor, HSTS uygulanamaz.",
    };
  }
  if (!value) {
    return { header: "Strict-Transport-Security", status: "FAIL", value: null, reason: "Header bulunamadı." };
  }
  const maxAgeMatch = value.match(/max-age=(\d+)/i);
  const maxAge = maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : 0;
  if (maxAge < 15552000) {
    // < 180 days
    return {
      header: "Strict-Transport-Security",
      status: "WARNING",
      value,
      reason: "max-age değeri çok düşük (önerilen: en az 180 gün / 15552000 saniye).",
    };
  }
  return { header: "Strict-Transport-Security", status: "PASS", value, reason: "Header mevcut ve yeterli max-age değerine sahip." };
}

function evaluateXContentTypeOptions(value: string | null): HeaderCheck {
  if (!value) {
    return { header: "X-Content-Type-Options", status: "FAIL", value: null, reason: "Header bulunamadı." };
  }
  if (value.toLowerCase().trim() !== "nosniff") {
    return { header: "X-Content-Type-Options", status: "WARNING", value, reason: "Değer 'nosniff' olmalı." };
  }
  return { header: "X-Content-Type-Options", status: "PASS", value, reason: "Header mevcut ve doğru yapılandırılmış." };
}

function evaluateXFrameOptions(value: string | null, csp: string | null): HeaderCheck {
  const cspHasFrameAncestors = csp?.toLowerCase().includes("frame-ancestors") ?? false;
  if (!value) {
    if (cspHasFrameAncestors) {
      return {
        header: "X-Frame-Options",
        status: "PASS",
        value: null,
        reason: "Header yok ancak CSP 'frame-ancestors' yönergesi clickjacking korumasını sağlıyor.",
      };
    }
    return { header: "X-Frame-Options", status: "FAIL", value: null, reason: "Header bulunamadı ve CSP frame-ancestors da yok." };
  }
  const normalized = value.toLowerCase().trim();
  if (normalized !== "deny" && normalized !== "sameorigin") {
    return { header: "X-Frame-Options", status: "WARNING", value, reason: "Değer DENY veya SAMEORIGIN olmalı." };
  }
  return { header: "X-Frame-Options", status: "PASS", value, reason: "Header mevcut ve doğru yapılandırılmış." };
}

function evaluateReferrerPolicy(value: string | null): HeaderCheck {
  if (!value) {
    return { header: "Referrer-Policy", status: "WARNING", value: null, reason: "Header bulunamadı." };
  }
  const weakValues = ["unsafe-url"];
  if (weakValues.includes(value.toLowerCase().trim())) {
    return { header: "Referrer-Policy", status: "WARNING", value, reason: "'unsafe-url' referrer bilgisini fazla paylaşır." };
  }
  return { header: "Referrer-Policy", status: "PASS", value, reason: "Header mevcut ve makul şekilde yapılandırılmış." };
}

function evaluatePermissionsPolicy(value: string | null): HeaderCheck {
  if (!value) {
    return { header: "Permissions-Policy", status: "WARNING", value: null, reason: "Header bulunamadı." };
  }
  return { header: "Permissions-Policy", status: "PASS", value, reason: "Header mevcut." };
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
