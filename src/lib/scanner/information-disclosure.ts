import type { InfoDisclosureCheckResult, InfoIssue } from "../types";

const VERSION_PATTERN = /\/[\d]+(\.[\d]+)+/;

export function checkInformationDisclosure(headers: Headers, html: string): InfoDisclosureCheckResult {
  const issues: InfoIssue[] = [];

  const serverHeader = headers.get("server");
  const poweredByHeader = headers.get("x-powered-by");

  if (serverHeader && VERSION_PATTERN.test(serverHeader)) {
    issues.push({ code: "serverVersion", value: serverHeader });
  } else if (serverHeader) {
    issues.push({ code: "serverGeneric", value: serverHeader });
  }

  if (poweredByHeader) {
    issues.push({ code: "poweredBy", value: poweredByHeader });
  }

  let generatorMeta: string | null = null;
  const metaMatch = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (metaMatch) {
    generatorMeta = metaMatch[1];
    issues.push({ code: "generator", value: generatorMeta });
  }

  const debugPatterns: Array<[RegExp, InfoIssue["code"]]> = [
    [/Warning:\s*(include|require)/i, "phpWarning"],
    [/Fatal error:/i, "phpFatal"],
    [/Traceback \(most recent call last\)/i, "pythonTraceback"],
    [/System\.Exception|at System\./i, "dotnetException"],
    [/DEBUG\s*=\s*True/i, "debugMode"],
  ];
  for (const [pattern, code] of debugPatterns) {
    if (pattern.test(html)) issues.push({ code });
  }

  return {
    status: issues.length === 0 ? "PASS" : "WARNING",
    serverHeader,
    poweredByHeader,
    generatorMeta,
    issues,
  };
}
