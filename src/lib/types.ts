export type CheckStatus = "PASS" | "WARNING" | "FAIL";

export type Severity = "HIGH" | "MEDIUM" | "LOW" | "PASS";

export interface Finding {
  category: string;
  severity: Severity;
  title: string;
  description: string;
  recommendation: string;
}

export interface HttpsCheckResult {
  status: CheckStatus;
  httpsReachable: boolean;
  httpRedirectsToHttps: boolean;
  tlsValid: boolean;
  finalUrl: string | null;
  details: string[];
}

export interface HeaderCheck {
  header: string;
  status: CheckStatus;
  value: string | null;
  reason: string;
}

export interface HeadersCheckResult {
  status: CheckStatus;
  checks: HeaderCheck[];
}

export interface CookieCheck {
  name: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string | null;
  issues: string[];
}

export interface CookiesCheckResult {
  status: CheckStatus;
  cookies: CookieCheck[];
  cookieCount: number;
}

export interface InfoDisclosureCheckResult {
  status: CheckStatus;
  serverHeader: string | null;
  poweredByHeader: string | null;
  generatorMeta: string | null;
  issues: string[];
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
  issues: string[];
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
  category: string;
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
