import type { Finding, ScanChecks } from "./types";
import type { Locale } from "./i18n/locales";
import { t, type MessageKey } from "./i18n/translate";

export interface TranslatedFinding {
  category: Finding["category"];
  severity: Finding["severity"];
  title: string;
  description: string;
  recommendation: string;
}

export function translateFinding(locale: Locale, finding: Finding): TranslatedFinding {
  return {
    category: finding.category,
    severity: finding.severity,
    title: t(locale, finding.titleKey, finding.titleParams),
    description: t(locale, finding.descriptionKey, finding.descriptionParams),
    recommendation: t(locale, finding.recommendationKey, finding.recommendationParams),
  };
}

const HEADER_RECOMMENDATION_KEY: Record<string, MessageKey> = {
  csp: "header.recommendation.csp",
  hsts: "header.recommendation.hsts",
  xcto: "header.recommendation.xcto",
  xfo: "header.recommendation.xfo",
  referrer: "header.recommendation.referrer",
  permissions: "header.recommendation.permissions",
};

function severityForHeader(headerKey: string, status: "WARNING" | "FAIL"): Finding["severity"] {
  const highImpact = ["csp", "hsts"];
  if (highImpact.includes(headerKey)) return status === "FAIL" ? "HIGH" : "MEDIUM";
  return status === "FAIL" ? "MEDIUM" : "LOW";
}

export function buildFindings(checks: ScanChecks): Finding[] {
  const findings: Finding[] = [];

  // HTTPS
  if (!checks.https.httpsReachable || !checks.https.tlsValid) {
    findings.push({
      category: "https",
      severity: "HIGH",
      titleKey: "finding.https.fail.title",
      descriptionKey: "finding.https.fail.description",
      recommendationKey: "finding.https.fail.recommendation",
    });
  } else if (!checks.https.httpRedirectsToHttps) {
    findings.push({
      category: "https",
      severity: "MEDIUM",
      titleKey: "finding.https.noRedirect.title",
      descriptionKey: "finding.https.noRedirect.description",
      recommendationKey: "finding.https.noRedirect.recommendation",
    });
  } else {
    findings.push({
      category: "https",
      severity: "PASS",
      titleKey: "finding.https.pass.title",
      descriptionKey: "finding.https.pass.description",
      recommendationKey: "finding.https.pass.recommendation",
    });
  }

  // Security headers
  for (const check of checks.headers.checks) {
    if (check.status === "PASS") {
      findings.push({
        category: "headers",
        severity: "PASS",
        titleKey: "finding.header.pass.title",
        titleParams: { header: check.header },
        descriptionKey: "finding.header.pass.description",
        recommendationKey: "finding.header.pass.recommendation",
      });
      continue;
    }
    findings.push({
      category: "headers",
      severity: severityForHeader(check.headerKey, check.status),
      titleKey: check.value ? "finding.header.weak.title" : "finding.header.missing.title",
      titleParams: { header: check.header },
      descriptionKey: `header.reason.${check.reasonCode}` as MessageKey,
      recommendationKey: HEADER_RECOMMENDATION_KEY[check.headerKey],
    });
  }

  // Cookies
  if (checks.cookies.cookieCount === 0) {
    findings.push({
      category: "cookies",
      severity: "PASS",
      titleKey: "finding.cookie.none.title",
      descriptionKey: "finding.cookie.none.description",
      recommendationKey: "finding.header.pass.recommendation",
    });
  } else {
    for (const cookie of checks.cookies.cookies) {
      if (cookie.issues.length === 0) {
        findings.push({
          category: "cookies",
          severity: "PASS",
          titleKey: "finding.cookie.pass.title",
          titleParams: { name: cookie.name },
          descriptionKey: "finding.cookie.pass.description",
          recommendationKey: "finding.header.pass.recommendation",
        });
      } else {
        findings.push({
          category: "cookies",
          severity: !cookie.secure || !cookie.httpOnly ? "MEDIUM" : "LOW",
          titleKey: "finding.cookie.issue.title",
          titleParams: { name: cookie.name },
          descriptionKey: `cookie.issue.${cookie.issues[0]}` as MessageKey,
          recommendationKey: "finding.cookie.issue.recommendation",
        });
      }
    }
  }

  // Information disclosure
  if (checks.infoDisclosure.issues.length === 0) {
    findings.push({
      category: "infoDisclosure",
      severity: "PASS",
      titleKey: "finding.info.none.title",
      descriptionKey: "finding.info.none.description",
      recommendationKey: "finding.header.pass.recommendation",
    });
  } else {
    for (const issue of checks.infoDisclosure.issues) {
      findings.push({
        category: "infoDisclosure",
        severity: "LOW",
        titleKey: "finding.info.issue.title",
        descriptionKey: `info.issue.${issue.code}` as MessageKey,
        descriptionParams: issue.value ? { value: issue.value } : undefined,
        recommendationKey: "finding.info.issue.recommendation",
      });
    }
  }

  // Exposure
  if (!checks.exposure.securityTxt.found) {
    findings.push({
      category: "exposure",
      severity: "LOW",
      titleKey: "finding.exposure.missing.title",
      descriptionKey: "finding.exposure.missing.description",
      recommendationKey: "finding.exposure.missing.recommendation",
    });
  } else {
    findings.push({
      category: "exposure",
      severity: "PASS",
      titleKey: "finding.exposure.found.title",
      descriptionKey: "finding.exposure.found.description",
      recommendationKey: "finding.exposure.found.recommendation",
    });
  }

  // HTTP methods
  for (const method of checks.httpMethods.exposedDangerous) {
    findings.push({
      category: "httpMethods",
      severity: "LOW",
      titleKey: "finding.httpMethods.issue.title",
      descriptionKey: "finding.httpMethods.issue.description",
      descriptionParams: { method },
      recommendationKey: "finding.httpMethods.issue.recommendation",
    });
  }

  return findings;
}
