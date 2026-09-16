import { describe, it, expect } from "vitest";
import { computeScore, CATEGORY_WEIGHTS } from "../src/lib/scoring";
import type { ScanChecks } from "../src/lib/types";

function buildChecks(overrides: Partial<Record<keyof ScanChecks, "PASS" | "WARNING" | "FAIL">> = {}): ScanChecks {
  const status = (key: keyof ScanChecks) => overrides[key] ?? "PASS";
  return {
    https: { status: status("https"), httpsReachable: true, httpRedirectsToHttps: true, tlsValid: true, finalUrl: null, details: [] },
    headers: { status: status("headers"), checks: [] },
    cookies: { status: status("cookies"), cookies: [], cookieCount: 0 },
    infoDisclosure: { status: status("infoDisclosure"), serverHeader: null, poweredByHeader: null, generatorMeta: null, issues: [] },
    exposure: { status: status("exposure"), robotsTxt: { found: false, url: "" }, sitemapXml: { found: false, url: "" }, securityTxt: { found: false, url: "" } },
    httpMethods: { status: status("httpMethods"), allowedMethods: [], issues: [] },
  };
}

describe("computeScore", () => {
  it("awards full weight for all PASS checks, totaling 100", () => {
    const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBe(100);

    const { score } = computeScore(buildChecks());
    expect(score).toBe(100);
  });

  it("awards zero for all FAIL checks", () => {
    const { score } = computeScore(
      buildChecks({
        https: "FAIL",
        headers: "FAIL",
        cookies: "FAIL",
        infoDisclosure: "FAIL",
        exposure: "FAIL",
        httpMethods: "FAIL",
      })
    );
    expect(score).toBe(0);
  });

  it("awards half weight for a WARNING check", () => {
    const { score, breakdown } = computeScore(buildChecks({ headers: "WARNING" }));
    const headersEntry = breakdown.find((b) => b.category === "headers")!;
    expect(headersEntry.earned).toBe(Math.round(CATEGORY_WEIGHTS.headers * 0.5));
    expect(score).toBe(100 - CATEGORY_WEIGHTS.headers / 2);
  });

  it("is deterministic for the same input", () => {
    const checks = buildChecks({ https: "WARNING", cookies: "FAIL" });
    expect(computeScore(checks).score).toBe(computeScore(checks).score);
  });
});
