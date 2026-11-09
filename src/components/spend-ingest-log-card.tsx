import { settingsGroupClass } from "@/components/page-shell";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import type { SpendIngestAttempt } from "@/lib/spend-ingest-log";

function formatWhen(iso: string, locale: Locale) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
      timeZone: "Asia/Tokyo",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(ms));
  } catch {
    return iso;
  }
}

function statusLabel(row: SpendIngestAttempt, locale: Locale) {
  if (row.ok) {
    return row.duplicate
      ? t(locale, "ingestLog.duplicate")
      : t(locale, "ingestLog.ok");
  }
  return t(locale, "ingestLog.fail");
}

export function SpendIngestLogCard({
  locale,
  rows,
  writable,
}: {
  locale: Locale;
  rows: SpendIngestAttempt[];
  writable: boolean;
}) {
  return (
    <div className={`${settingsGroupClass} px-4 py-3`}>
      <p className="text-[14px] font-medium text-ink">
        {t(locale, "ingestLog.title")}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">
        {writable
          ? t(locale, "ingestLog.body")
          : t(locale, "ingestLog.noKv")}
      </p>
      {rows.length === 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[12px] text-ink-muted">
            {t(locale, "ingestLog.empty")}
          </p>
          <p className="text-[11px] leading-relaxed text-ink-muted">
            {t(locale, "ingestLog.emptyHint")}
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 20).map((row) => {
            const bits = [
              row.card,
              row.merchant,
              row.amount != null ? String(row.amount) : null,
              `HTTP ${row.status}`,
            ].filter(Boolean);
            return (
              <li
                key={`${row.at}-${row.status}-${row.expenseId ?? row.error ?? ""}`}
                className="rounded-lg border border-line/70 bg-canvas/60 px-2.5 py-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-[12px] font-semibold ${
                      row.ok ? "text-ok" : "text-accent"
                    }`}
                  >
                    {statusLabel(row, locale)}
                  </span>
                  <span className="text-[11px] tabular-nums text-ink-muted">
                    {formatWhen(row.at, locale)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {bits.join(" · ")}
                </p>
                {!row.authOk ? (
                  <p className="mt-0.5 text-[11px] text-accent">
                    {row.authPresent
                      ? t(locale, "ingestLog.authBad")
                      : t(locale, "ingestLog.authMissing")}
                  </p>
                ) : null}
                {row.error ? (
                  <p className="mt-0.5 text-[11px] text-ink">{row.error}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
