import type { MessageKey } from "./i18n/translate";

export type CheckStatus = "PASS" | "WARNING" | "FAIL";

export type Severity = "HIGH" | "MEDIUM" | "LOW" | "PASS";

export type CategoryKey = "https" | "headers" | "cookies" | "infoDisclosure" | "exposure" | "httpMethods";

export type MessageParams = Record<string, string | number>;

/** A user-facing finding, kept language-neutral: only translated at render time via translateFinding(). */
export interface Finding {
  category: CategoryKey;
  severity: Severity;
  titleKey: MessageKey;
  titleParams?: MessageParams;
  descriptionKey: MessageKey;
  descriptionParams?: MessageParams;
  recommendationKey: MessageKey;
  recommendationParams?: MessageParams;
}

export interface HttpsCheckResult {
  status: CheckStatus;
  httpsReachable: boolean;
  httpRedirectsToHttps: boolean;
  tlsValid: boolean;
  finalUrl: string | null;
}

export type HeaderKey = "csp" | "hsts" | "xcto" | "xfo" | "referrer" | "permissions";

/** Suffix after "header.reason." in the message dictionary, e.g. "csp.missing" -> header.reason.csp.missing */
export type HeaderReasonCode =
  | "csp.missing"
  | "csp.weak"
  | "csp.pass"
  | "hsts.noHttps"
  | "hsts.missing"
  | "hsts.weak"
  | "hsts.pass"
  | "xcto.missing"
  | "xcto.weak"
  | "xcto.pass"
  | "xfo.missingNoCsp"
  | "xfo.passViaCsp"
  | "xfo.weak"
  | "xfo.pass"
  | "referrer.missing"
  | "referrer.weak"
  | "referrer.pass"
  | "permissions.missing"
  | "permissions.pass";

export interface HeaderCheck {
  headerKey: HeaderKey;
  /** The literal HTTP header name (e.g. "Content-Security-Policy") — a technical term, never translated. */
  header: string;
  status: CheckStatus;
  value: string | null;
  reasonCode: HeaderReasonCode;
}

export interface HeadersCheckResult {
  status: CheckStatus;
  checks: HeaderCheck[];
}

export type CookieIssueCode = "missingSecure" | "missingHttpOnly" | "missingSameSite" | "sameSiteNoneNoSecure";

export interface CookieCheck {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  issues: CookieIssueCode[];
}

export interface CookiesCheckResult {
  status: CheckStatus;
  cookies: CookieCheck[];
  cookieCount: number;
}

export type InfoIssueCode =
  | "serverVersion"
  | "serverGeneric"
  | "poweredBy"
  | "generator"
  | "phpWarning"
  | "phpFatal"
  | "pythonTraceback"
  | "dotnetException"
  | "debugMode";

export interface InfoIssue {
  code: InfoIssueCode;
  value?: string;
}

export interface InfoDisclosureCheckResult {
  status: CheckStatus;
  serverHeader: string | null;
  poweredByHeader: string | null;
  generatorMeta: string | null;
  issues: InfoIssue[];
}

export interface ExposureCheckResult {
  status: CheckStatus;
  robotsTxt: { found: boolean; url: string };
  sitemapXml: { found: boolean; url: string };
  securityTxt: { found: boolean; url: string };
}

export interface HttpMethodsCheckResult {
  status: CheckStatus;
  allowedMethods: string[];
  exposedDangerous: string[];
}

export interface ScanChecks {
  https: HttpsCheckResult;
  headers: HeadersCheckResult;
  cookies: CookiesCheckResult;
  infoDisclosure: InfoDisclosureCheckResult;
  exposure: ExposureCheckResult;
  httpMethods: HttpMethodsCheckResult;
}

export interface ScoreBreakdownEntry {
  category: CategoryKey;
  weight: number;
  earned: number;
  status: CheckStatus;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdownEntry[];
}

export interface ScanResult {
  url: string;
  normalizedUrl: string;
  scannedAt: string;
  checks: ScanChecks;
  findings: Finding[];
  score: ScoreResult;
}

export interface AiSummary {
  overview: string;
  findingExplanations: Array<{
    title: string;
    explanation: string;
    whyItMatters: string;
    recommendation: string;
  }>;
}
