import type { CheckStatus } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";
import { StatusBadge } from "./StatusBadge";

export function CheckCard({
  title,
  status,
  detail,
  locale,
}: {
  title: string;
  status: CheckStatus;
  detail: string;
  locale: Locale;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
        <StatusBadge status={status} locale={locale} />
      </div>
      <p className="text-xs text-[var(--muted)]">{detail}</p>
    </div>
  );
}
