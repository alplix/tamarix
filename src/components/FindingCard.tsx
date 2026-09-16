import type { Finding } from "@/lib/types";
import { SeverityBadge } from "./StatusBadge";

interface AiExplanation {
  explanation: string;
  whyItMatters: string;
  recommendation: string;
}

export function FindingCard({ finding, aiExplanation }: { finding: Finding; aiExplanation?: AiExplanation }) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{finding.category}</span>
      </div>
      <h4 className="text-sm font-semibold text-[var(--foreground)]">{finding.title}</h4>
      <p className="text-sm text-[var(--muted)]">{aiExplanation?.explanation ?? finding.description}</p>
      {aiExplanation?.whyItMatters && (
        <p className="text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">Neden önemli: </span>
          {aiExplanation.whyItMatters}
        </p>
      )}
      {finding.severity !== "PASS" && (
        <p className="text-xs text-[var(--accent)]">
          <span className="font-medium">Öneri: </span>
          {aiExplanation?.recommendation ?? finding.recommendation}
        </p>
      )}
    </div>
  );
}
