import type { InfoDisclosureCheckResult } from "../types";

const VERSION_PATTERN = /\/[\d]+(\.[\d]+)+/;

export function checkInformationDisclosure(headers: Headers, html: string): InfoDisclosureCheckResult {
  const issues: string[] = [];

  const serverHeader = headers.get("server");
  const poweredByHeader = headers.get("x-powered-by");

  if (serverHeader && VERSION_PATTERN.test(serverHeader)) {
    issues.push(`Server header'ı sürüm bilgisi sızdırıyor: "${serverHeader}".`);
  } else if (serverHeader) {
    issues.push(`Server header'ı mevcut: "${serverHeader}" (yazılım türünü açığa çıkarıyor).`);
  }

  if (poweredByHeader) {
    issues.push(`X-Powered-By header'ı mevcut: "${poweredByHeader}".`);
  }

  let generatorMeta: string | null = null;
  const metaMatch = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (metaMatch) {
    generatorMeta = metaMatch[1];
    issues.push(`HTML generator meta etiketi mevcut: "${generatorMeta}".`);
  }

  const debugPatterns: Array<[RegExp, string]> = [
    [/Warning:\s*(include|require)/i, "PHP dahil etme uyarısı HTML içinde görünüyor."],
    [/Fatal error:/i, "PHP fatal error mesajı HTML içinde görünüyor."],
    [/Traceback \(most recent call last\)/i, "Python traceback HTML içinde görünüyor."],
    [/System\.Exception|at System\./i, ".NET istisna izleri HTML içinde görünüyor."],
    [/DEBUG\s*=\s*True/i, "Debug modu etkin görünüyor (DEBUG = True)."],
  ];
  for (const [pattern, message] of debugPatterns) {
    if (pattern.test(html)) issues.push(message);
  }

  return {
    status: issues.length === 0 ? "PASS" : "WARNING",
    serverHeader,
    poweredByHeader,
    generatorMeta,
    issues,
  };
}
