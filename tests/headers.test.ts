import { describe, it, expect } from "vitest";
import { checkSecurityHeaders } from "../src/lib/scanner/headers";

function headersFrom(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("checkSecurityHeaders", () => {
  it("fails when all headers are missing", () => {
    const result = checkSecurityHeaders(headersFrom({}), true);
    expect(result.status).toBe("FAIL");
    const csp = result.checks.find((c) => c.header === "Content-Security-Policy")!;
    expect(csp.status).toBe("FAIL");
  });

  it("passes when all headers are present and well configured", () => {
    const result = checkSecurityHeaders(
      headersFrom({
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "permissions-policy": "geolocation=()",
      }),
      true
    );
    expect(result.status).toBe("PASS");
    expect(result.checks.every((c) => c.status === "PASS")).toBe(true);
  });

  it("warns on a weak CSP using unsafe-inline", () => {
    const result = checkSecurityHeaders(headersFrom({ "content-security-policy": "default-src 'self' 'unsafe-inline'" }), true);
    const csp = result.checks.find((c) => c.header === "Content-Security-Policy")!;
    expect(csp.status).toBe("WARNING");
  });

  it("warns on HSTS with too-low max-age", () => {
    const result = checkSecurityHeaders(headersFrom({ "strict-transport-security": "max-age=60" }), true);
    const hsts = result.checks.find((c) => c.header === "Strict-Transport-Security")!;
    expect(hsts.status).toBe("WARNING");
  });

  it("does not fail HSTS on a non-HTTPS site", () => {
    const result = checkSecurityHeaders(headersFrom({}), false);
    const hsts = result.checks.find((c) => c.header === "Strict-Transport-Security")!;
    expect(hsts.status).toBe("WARNING");
    expect(hsts.status).not.toBe("FAIL");
  });

  it("passes X-Frame-Options via CSP frame-ancestors even without the header itself", () => {
    const result = checkSecurityHeaders(headersFrom({ "content-security-policy": "frame-ancestors 'self'" }), true);
    const xfo = result.checks.find((c) => c.header === "X-Frame-Options")!;
    expect(xfo.status).toBe("PASS");
  });
});
