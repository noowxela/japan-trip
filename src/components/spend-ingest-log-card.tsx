"use client";

import { useMemo, useState } from "react";
import { settingsGroupClass } from "@/components/page-shell";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import {
  INGEST_LOG_PAGE_SIZE,
  paginateIngestLog,
  type SpendIngestAttempt,
} from "@/lib/spend-ingest-log";

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
    if (row.entryDetect) return t(locale, "ingestLog.entryDetect");
    return row.duplicate
      ? t(locale, "ingestLog.duplicate")
      : t(locale, "ingestLog.ok");
  }
  return t(locale, "ingestLog.fail");
}

function statusClass(row: SpendIngestAttempt) {
  if (row.entryDetect) return "text-ink";
  return row.ok ? "text-ok" : "text-accent";
}

function IngestLogRow({
  row,
  locale,
}: {
  row: SpendIngestAttempt;
  locale: Locale;
}) {
  const bits = [
    row.name,
    row.card,
    row.merchant && row.merchant !== row.name ? row.merchant : null,
    row.amount != null ? String(row.amount) : null,
    `HTTP ${row.status}`,
  ].filter(Boolean);
  return (
    <li className="rounded-lg border border-line/70 bg-canvas/60 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[12px] font-semibold ${statusClass(row)}`}>
          {statusLabel(row, locale)}
        </span>
        <span className="text-[11px] tabular-nums text-ink-muted">
          {formatWhen(row.at, locale)}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-ink-muted">{bits.join(" · ")}</p>
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
      {row.emptyKeys && row.emptyKeys.length > 0 ? (
        <p className="mt-0.5 text-[11px] text-accent">
          {t(locale, "ingestLog.emptyFields").replace(
            "{keys}",
            row.emptyKeys.join(", "),
          )}
        </p>
      ) : null}
      {row.amountType || (row.keys && row.keys.length > 0) ? (
        <p className="mt-0.5 text-[10px] text-ink-muted">
          {[
            row.amountType ? `amount:${row.amountType}` : null,
            row.keys && row.keys.length ? `keys:${row.keys.join(",")}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {row.raw ? (
        <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded bg-canvas px-1.5 py-1 font-mono text-[10px] leading-snug text-ink-muted">
          {row.raw}
        </pre>
      ) : null}
    </li>
  );
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
  const [page, setPage] = useState(1);
  const paged = useMemo(
    () => paginateIngestLog(rows, page, INGEST_LOG_PAGE_SIZE),
    [rows, page],
  );
  const showPager = paged.total > INGEST_LOG_PAGE_SIZE;

  return (
    <div className={`${settingsGroupClass} px-4 py-3`}>
      <p className="text-[14px] font-medium text-ink">
        {t(locale, "ingestLog.title")}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">
        {writable ? t(locale, "ingestLog.body") : t(locale, "ingestLog.noKv")}
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
        <>
          <ul className="mt-3 space-y-2">
            {paged.slice.map((row) => (
              <IngestLogRow
                key={`${row.at}-${row.status}-${row.expenseId ?? row.error ?? ""}`}
                row={row}
                locale={locale}
              />
            ))}
          </ul>
          {showPager ? (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1 text-[12px] font-medium text-accent disabled:opacity-40"
                disabled={paged.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t(locale, "ingestLog.prev")}
              </button>
              <p className="text-[11px] tabular-nums text-ink-muted">
                {t(locale, "ingestLog.pageRange", {
                  from: paged.from,
                  to: paged.to,
                  total: paged.total,
                })}
              </p>
              <button
                type="button"
                className="rounded-full px-3 py-1 text-[12px] font-medium text-accent disabled:opacity-40"
                disabled={paged.page >= paged.pageCount}
                onClick={() =>
                  setPage((current) => Math.min(paged.pageCount, current + 1))
                }
              >
                {t(locale, "ingestLog.next")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
