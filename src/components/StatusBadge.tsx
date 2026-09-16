import type { CheckStatus, Severity } from "@/lib/types";

const STATUS_LABEL: Record<CheckStatus, string> = {
  PASS: "PASS",
  WARNING: "WARNING",
  FAIL: "FAIL",
};

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

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      <span>{STATUS_ICON[status]}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

const SEVERITY_LABEL: Record<Severity, string> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  PASS: "PASS",
};

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

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge ${SEVERITY_CLASS[severity]}`}>
      <span>{SEVERITY_ICON[severity]}</span>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
