// Canonical message dictionary. Every other locale file must implement exactly these keys —
// see tests/i18n.test.ts, which fails if a locale drifts from this key set.
const en = {
  // Chrome
  "label.recommendation": "Recommendation:",
  "label.whyItMatters": "Why it matters:",
  "header.subtitle": "Website Security Scanner",
  "home.tagline":
    "Scan your website for common security configuration issues — HTTPS, security headers, cookies, and information disclosure — using safe, passive checks only.",
  "home.recentScans": "Recent Scans",
  "form.placeholder": "https://example.com",
  "form.button.scan": "Scan Website",
  "form.button.scanning": "Scanning…",
  "scan.backLink": "← New scan",
  "scan.scannedAt": "Scanned {date}",
  "scan.aiSummaryTitle": "AI Summary",
  "scan.aiSummaryUnavailable": "AI summary could not be generated: {error}",
  "scan.aiSummaryLoading": "Generating AI summary…",
  "scan.checkResultsTitle": "Check Results",
  "scan.findingsTitle": "Findings & Recommendations",
  "scan.scoreBreakdownTitle": "Score Breakdown",
  "scan.securityScoreLabel": "Security Score",
  "scan.pointsLabel": "{earned} / {weight} points",

  // Status / severity / category labels
  "status.PASS": "PASS",
  "status.WARNING": "WARNING",
  "status.FAIL": "FAIL",
  "severity.HIGH": "HIGH",
  "severity.MEDIUM": "MEDIUM",
  "severity.LOW": "LOW",
  "severity.PASS": "PASS",
  "category.https": "HTTPS",
  "category.headers": "Security Headers",
  "category.cookies": "Cookies",
  "category.infoDisclosure": "Information Disclosure",
  "category.exposure": "Exposure Checks",
  "category.httpMethods": "HTTP Methods",

  // Check card detail lines
  "checkDetail.https.ok": "HTTPS connection succeeded and HTTP redirects to HTTPS.",
  "checkDetail.https.noRedirect": "HTTPS connection succeeded, but HTTP does not redirect to HTTPS.",
  "checkDetail.https.failed": "HTTPS connection could not be established.",
  "checkDetail.headers": "{passed}/{total} headers are properly configured.",
  "checkDetail.cookies.none": "No cookies detected.",
  "checkDetail.cookies.some": "{count} cookies reviewed.",
  "checkDetail.infoDisclosure.none": "No exposed technical information found.",
  "checkDetail.infoDisclosure.some": "{count} issue(s) found.",
  "checkDetail.exposure.found": "security.txt is present.",
  "checkDetail.exposure.missing": "security.txt was not found.",
  "checkDetail.httpMethods.some": "Allowed: {methods}",
  "checkDetail.httpMethods.none": "No information available.",

  // Findings: HTTPS
  "finding.https.fail.title": "HTTPS is not available",
  "finding.https.fail.description":
    "The site cannot be reliably reached over HTTPS, or the TLS connection could not be established.",
  "finding.https.fail.recommendation":
    "Enable HTTPS with a valid TLS certificate and make sure the certificate is up to date.",
  "finding.https.noRedirect.title": "HTTP does not redirect to HTTPS",
  "finding.https.noRedirect.description":
    "The site supports HTTPS, but plain HTTP requests are not automatically redirected to HTTPS.",
  "finding.https.noRedirect.recommendation":
    "Add a rule at the server or load-balancer level that redirects all HTTP requests to HTTPS.",
  "finding.https.pass.title": "HTTPS is properly configured",
  "finding.https.pass.description": "The site is reachable over HTTPS and HTTP requests redirect to HTTPS.",
  "finding.https.pass.recommendation": "Keep the current configuration.",

  // Findings: security headers
  "finding.header.pass.title": "{header}",
  "finding.header.pass.description": "The header is present and properly configured.",
  "finding.header.pass.recommendation": "Keep the current configuration.",
  "finding.header.missing.title": "Missing {header}",
  "finding.header.weak.title": "Weak {header} configuration",

  "header.reason.csp.missing": "This site does not send a Content-Security-Policy header.",
  "header.reason.csp.weak":
    "A policy is present, but 'unsafe-inline', 'unsafe-eval', or a wildcard (*) source weakens it.",
  "header.reason.csp.pass": "The header is present and reasonably configured.",
  "header.reason.hsts.noHttps": "The site does not use HTTPS, so HSTS cannot be enforced.",
  "header.reason.hsts.missing": "The header was not found.",
  "header.reason.hsts.weak": "The max-age value is too low (recommended: at least 180 days / 15552000 seconds).",
  "header.reason.hsts.pass": "The header is present with a sufficient max-age value.",
  "header.reason.xcto.missing": "The header was not found.",
  "header.reason.xcto.weak": "The value should be 'nosniff'.",
  "header.reason.xcto.pass": "The header is present and properly configured.",
  "header.reason.xfo.missingNoCsp": "The header was not found, and the CSP has no frame-ancestors directive either.",
  "header.reason.xfo.passViaCsp":
    "The header is absent, but the CSP's 'frame-ancestors' directive provides clickjacking protection.",
  "header.reason.xfo.weak": "The value should be DENY or SAMEORIGIN.",
  "header.reason.xfo.pass": "The header is present and properly configured.",
  "header.reason.referrer.missing": "The header was not found.",
  "header.reason.referrer.weak": "'unsafe-url' shares too much referrer information.",
  "header.reason.referrer.pass": "The header is present and reasonably configured.",
  "header.reason.permissions.missing": "The header was not found.",
  "header.reason.permissions.pass": "The header is present.",

  "header.recommendation.csp":
    "Define a Content-Security-Policy specific to your app, without unnecessary wildcard (*) sources or 'unsafe-inline'.",
  "header.recommendation.hsts":
    "Configure an appropriate HSTS policy on HTTPS production sites, e.g. 'max-age=31536000; includeSubDomains'.",
  "header.recommendation.xcto": "Add an 'X-Content-Type-Options: nosniff' header to responses.",
  "header.recommendation.xfo":
    "Add an 'X-Frame-Options: DENY' header, or a 'frame-ancestors' directive in your CSP.",
  "header.recommendation.referrer": "Define a policy such as 'Referrer-Policy: strict-origin-when-cross-origin'.",
  "header.recommendation.permissions": "Define a Permissions-Policy to restrict unused browser features.",

  // Findings: cookies
  "finding.cookie.none.title": "No cookies detected",
  "finding.cookie.none.description": "No Set-Cookie header was found in the response.",
  "finding.cookie.pass.title": 'Cookie "{name}" is configured securely',
  "finding.cookie.pass.description": "The Secure, HttpOnly, and SameSite flags are all set correctly.",
  "finding.cookie.issue.title": 'Cookie "{name}" is missing security flags',
  "finding.cookie.issue.recommendation": "Set the cookie with Secure, HttpOnly, and an appropriate SameSite value.",
  "cookie.issue.missingSecure": "Missing the Secure flag.",
  "cookie.issue.missingHttpOnly": "Missing the HttpOnly flag.",
  "cookie.issue.missingSameSite": "Missing the SameSite flag.",
  "cookie.issue.sameSiteNoneNoSecure": "SameSite=None requires the Secure flag.",

  // Findings: information disclosure
  "finding.info.none.title": "No exposed technical information detected",
  "finding.info.none.description": "No obvious version/error information was found in response headers or HTML.",
  "finding.info.issue.title": "Sensitive technical information is exposed",
  "finding.info.issue.recommendation":
    "Hide server/framework headers and make sure error messages or debug output are not shown in production.",
  "info.issue.serverVersion": 'The Server header leaks version information: "{value}".',
  "info.issue.serverGeneric": 'The Server header is present: "{value}" (reveals the software type).',
  "info.issue.poweredBy": 'The X-Powered-By header is present: "{value}".',
  "info.issue.generator": 'An HTML generator meta tag is present: "{value}".',
  "info.issue.phpWarning": "A PHP include/require warning is visible in the HTML.",
  "info.issue.phpFatal": "A PHP fatal error message is visible in the HTML.",
  "info.issue.pythonTraceback": "A Python traceback is visible in the HTML.",
  "info.issue.dotnetException": ".NET exception traces are visible in the HTML.",
  "info.issue.debugMode": "Debug mode appears to be enabled (DEBUG = True).",

  // Findings: exposure
  "finding.exposure.missing.title": "security.txt was not found",
  "finding.exposure.missing.description":
    "The /.well-known/security.txt file is missing, making it harder for security researchers to report issues responsibly.",
  "finding.exposure.missing.recommendation": "Publish a security.txt file in the RFC 9116 format.",
  "finding.exposure.found.title": "security.txt is present",
  "finding.exposure.found.description": "The site publishes a security.txt file.",
  "finding.exposure.found.recommendation": "Keep the current configuration.",

  // Findings: HTTP methods
  "finding.httpMethods.issue.title": "A potentially dangerous HTTP method is exposed",
  "finding.httpMethods.issue.description": "The server reports that it allows the {method} method.",
  "finding.httpMethods.issue.recommendation": "Disable unused HTTP methods in the server configuration.",

  // Errors surfaced to the user
  "error.invalid_url": "Invalid URL format.",
  "error.blocked_protocol": "Only http:// or https:// addresses can be scanned.",
  "error.blocked_credentials": "The URL must not contain credentials.",
  "error.blocked_target": "This target cannot be scanned.",
  "error.blocked_ip_literal": "This target cannot be scanned (private/local IP address).",
  "error.dns_failure": "The domain name could not be resolved (DNS error).",
  "error.dns_empty": "The domain name could not be resolved.",
  "error.blocked_ip_resolved": "This target cannot be scanned (it resolves to a private/local IP address).",
  "error.request_timeout": "The request timed out.",
  "error.connection_failed": "Could not connect to the site.",
  "error.too_many_redirects": "Too many redirects (redirect loop).",
  "error.missing_url": "Please enter a website URL.",
  "error.invalid_body": "Invalid request body.",
  "error.rate_limited": "Too many requests. Please try again in a minute.",
  "error.scan_timeout": "The site timed out, please try again later.",
  "error.scan_unreachable": "The site could not be reached. Please check the address and try again.",
  "error.unexpected": "An unexpected error occurred. Please try again.",
  "error.scan_not_found": "Scan not found.",
  "error.history_load_failed": "Could not load scan history.",
  "error.scan_load_failed": "Could not load the scan.",
  "error.network": "Could not connect to the server. Please try again.",
} as const;

export default en;
export type MessageKey = keyof typeof en;
