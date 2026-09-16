import type { CheckStatus, Severity } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";
import { t, type MessageKey } from "@/lib/i18n/translate";

const STATUS_CLASS: Record<CheckStatus, string> = {
  PASS: "badge-pass",
  WARNING: "badge-warning",
  FAIL: "badge-fail",
};

const STATUS_ICON: Record<CheckStatus, string> = {
  PASS: "✓",
  WARNING: "⚠",
  FAIL: "✕",
};

export function StatusBadge({ status, locale }: { status: CheckStatus; locale: Locale }) {
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      <span>{STATUS_ICON[status]}</span>
      {t(locale, `status.${status}` as MessageKey)}
    </span>
  );
}

const SEVERITY_CLASS: Record<Severity, string> = {
  HIGH: "badge-high",
  MEDIUM: "badge-medium",
  LOW: "badge-low",
  PASS: "badge-pass",
};

const SEVERITY_ICON: Record<Severity, string> = {
  HIGH: "\u{1F534}",
  MEDIUM: "\u{1F7E1}",
  LOW: "\u{1F535}",
  PASS: "\u{1F7E2}",
};

export function SeverityBadge({ severity, locale }: { severity: Severity; locale: Locale }) {
  return (
    <span className={`badge ${SEVERITY_CLASS[severity]}`}>
      <span>{SEVERITY_ICON[severity]}</span>
      {t(locale, `severity.${severity}` as MessageKey)}
    </span>
  );
}
