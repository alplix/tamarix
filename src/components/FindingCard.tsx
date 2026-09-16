import type { Locale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/translate";
import type { TranslatedFinding } from "@/lib/findings";
import { SeverityBadge } from "./StatusBadge";

interface AiExplanation {
  explanation: string;
  whyItMatters: string;
  recommendation: string;
}

export function FindingCard({
  finding,
  locale,
  aiExplanation,
}: {
  finding: TranslatedFinding;
  locale: Locale;
  aiExplanation?: AiExplanation;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={finding.severity} locale={locale} />
        <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
          {t(locale, `category.${finding.category}`)}
        </span>
      </div>
      <h4 className="text-sm font-semibold text-[var(--foreground)]">{finding.title}</h4>
      <p className="text-sm text-[var(--muted)]">{aiExplanation?.explanation ?? finding.description}</p>
      {aiExplanation?.whyItMatters && (
        <p className="text-xs text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">{t(locale, "label.whyItMatters")} </span>
          {aiExplanation.whyItMatters}
        </p>
      )}
      {finding.severity !== "PASS" && (
        <p className="text-xs text-[var(--accent)]">
          <span className="font-medium">{t(locale, "label.recommendation")} </span>
          {aiExplanation?.recommendation ?? finding.recommendation}
        </p>
      )}
    </div>
  );
}
