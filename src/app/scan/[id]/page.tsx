import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ScoreGauge } from "@/components/ScoreGauge";
import { CheckCard } from "@/components/CheckCard";
import { FindingCard } from "@/components/FindingCard";
import type { AiSummary, CheckStatus, Finding, ScanResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const scan = await prisma.scan.findUnique({
    where: { id },
    include: { findings: true },
  });

  if (!scan) notFound();

  const raw = scan.rawResult as unknown as ScanResult;
  const aiSummary = scan.aiSummary as unknown as AiSummary | null;

  const findings: Finding[] = scan.findings.map((f) => ({
    category: f.category,
    severity: f.severity as Finding["severity"],
    title: f.title,
    description: f.description,
    recommendation: f.recommendation,
  }));

  const explanationByTitle = new Map(aiSummary?.findingExplanations.map((e) => [e.title, e]) ?? []);

  const severityOrder: Record<Finding["severity"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2, PASS: 3 };
  const sortedFindings = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const checkCards: Array<{ title: string; status: CheckStatus; detail: string }> = [
    { title: "HTTPS", status: scan.httpsStatus as CheckStatus, detail: raw.checks.https.details.join(" ") || "—" },
    {
      title: "Security Headers",
      status: scan.headersStatus as CheckStatus,
      detail: `${raw.checks.headers.checks.filter((c) => c.status === "PASS").length}/${raw.checks.headers.checks.length} header uygun yapılandırılmış.`,
    },
    {
      title: "Cookies",
      status: scan.cookiesStatus as CheckStatus,
      detail: raw.checks.cookies.cookieCount === 0 ? "Cookie tespit edilmedi." : `${raw.checks.cookies.cookieCount} cookie incelendi.`,
    },
    {
      title: "Information Disclosure",
      status: scan.infoDisclosureStatus as CheckStatus,
      detail: raw.checks.infoDisclosure.issues.length === 0 ? "Açık teknik bilgi bulunamadı." : `${raw.checks.infoDisclosure.issues.length} bulgu tespit edildi.`,
    },
    {
      title: "Exposure Checks",
      status: scan.exposureStatus as CheckStatus,
      detail: raw.checks.exposure.securityTxt.found ? "security.txt mevcut." : "security.txt bulunamadı.",
    },
    {
      title: "HTTP Methods",
      status: scan.httpMethodsStatus as CheckStatus,
      detail: raw.checks.httpMethods.allowedMethods.length > 0 ? `İzin verilen: ${raw.checks.httpMethods.allowedMethods.join(", ")}` : "Bilgi alınamadı.",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <Link href="/" className="text-sm text-[var(--accent)] hover:underline">
            ← New scan
          </Link>
          <h1 className="mt-2 break-all text-2xl font-semibold">{scan.url}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Scanned {new Date(scan.createdAt).toLocaleString()}</p>
        </div>
        <ScoreGauge score={scan.score} />
      </div>

      {aiSummary?.overview && (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">AI Summary</h2>
          <p className="text-sm text-[var(--foreground)]">{aiSummary.overview}</p>
        </div>
      )}
      {!aiSummary && scan.aiSummaryError && (
        <div className="card border-[var(--warning)]/40 p-5">
          <p className="text-sm text-[var(--muted)]">AI özeti oluşturulamadı: {scan.aiSummaryError}</p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Check Results</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checkCards.map((card) => (
            <CheckCard key={card.title} {...card} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Findings & Recommendations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sortedFindings.map((finding, i) => (
            <FindingCard key={i} finding={finding} aiExplanation={explanationByTitle.get(finding.title)} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">Score Breakdown</h2>
        <div className="card divide-y divide-[var(--border)]">
          {raw.score.breakdown.map((entry) => (
            <div key={entry.category} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="capitalize text-[var(--foreground)]">{entry.category}</span>
              <span className="text-[var(--muted)]">
                {entry.earned} / {entry.weight} puan
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
