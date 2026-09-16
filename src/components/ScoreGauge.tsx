import type { Locale } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/translate";

function scoreColor(score: number): string {
  if (score >= 80) return "var(--pass)";
  if (score >= 50) return "var(--warning)";
  return "var(--fail)";
}

export function ScoreGauge({ score, locale }: { score: number; locale: Locale }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-[140px] w-[140px]">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-[var(--muted)]">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        {t(locale, "scan.securityScoreLabel")}
      </span>
    </div>
  );
}
