import type { ReactNode } from "react";
import { clearVisitorCookie } from "@/app/settings/cookies/actions";
import { BrowserSignals } from "@/components/browser-signals";
import { compactBtnGhostClass } from "@/components/compact/classes";
import { settingsGroupClass } from "@/components/page-shell";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import {
  formatGeo,
  formatVisitorTime,
  maskCookieValue,
  type VisitorRecord,
} from "@/lib/visitor";

type CookieRow = { name: string; value: string };

function Fact({
  label,
  value,
  mono = false,
  nowrap = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  nowrap?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-[12px] text-ink-muted">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right text-[12px] leading-4 text-ink [overflow-wrap:anywhere] ${
          mono ? "font-mono text-[11px]" : ""
        } ${nowrap ? "tabular-nums whitespace-nowrap" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[12px] font-medium leading-4 text-ink-muted">
            {title}
          </h2>
          <p className="mt-0.5 min-w-0 break-words text-[11px] leading-snug text-ink-muted [overflow-wrap:anywhere]">
            {hint}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={`${settingsGroupClass} px-3 py-2.5`}>{children}</div>
    </section>
  );
}

function dash(locale: Locale, value: string | null | undefined) {
  return value?.trim() ? value : t(locale, "cookieLab.unknown");
}

function visitLabel(locale: Locale, count: number) {
  return count === 1
    ? t(locale, "cookieLab.visitOnce")
    : t(locale, "cookieLab.visits", { n: count });
}

export function CookieLab({
  locale,
  ip,
  geo,
  device,
  os,
  browser,
  language,
  referer,
  visitorId,
  visitCount,
  firstSeen,
  lastSeen,
  cookies,
  canEdit,
  visitors,
  storeWritable,
}: {
  locale: Locale;
  ip: string | null;
  geo: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  language: string | null;
  referer: string | null;
  visitorId: string | null;
  visitCount: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  cookies: CookieRow[];
  canEdit: boolean;
  visitors: VisitorRecord[];
  storeWritable: boolean;
}) {
  return (
    <div className="space-y-3">
      <Section
        title={t(locale, "cookieLab.serverSection")}
        hint={t(locale, "cookieLab.serverHint")}
      >
        <dl>
          <Fact label={t(locale, "cookieLab.ip")} value={dash(locale, ip)} mono />
          <Fact label={t(locale, "cookieLab.geo")} value={dash(locale, geo)} />
          <Fact label={t(locale, "cookieLab.device")} value={dash(locale, device)} />
          <Fact label={t(locale, "cookieLab.os")} value={dash(locale, os)} />
          <Fact label={t(locale, "cookieLab.browser")} value={dash(locale, browser)} />
          <Fact
            label={t(locale, "cookieLab.language")}
            value={dash(locale, language)}
          />
          <Fact
            label={t(locale, "cookieLab.referer")}
            value={dash(locale, referer)}
            mono
          />
        </dl>
      </Section>

      <Section
        title={t(locale, "cookieLab.cookiesSection")}
        hint={t(locale, "cookieLab.cookiesHint")}
        action={
          <form action={clearVisitorCookie}>
            <button type="submit" className={compactBtnGhostClass}>
              {t(locale, "cookieLab.clear")}
            </button>
          </form>
        }
      >
        <dl>
          <Fact
            label={t(locale, "cookieLab.visitorId")}
            value={dash(locale, visitorId)}
            mono
          />
          <Fact
            label={t(locale, "cookieLab.visitCount")}
            value={
              visitCount != null
                ? visitLabel(locale, visitCount)
                : t(locale, "cookieLab.unknown")
            }
            nowrap
          />
          <Fact
            label={t(locale, "cookieLab.firstSeen")}
            value={
              firstSeen
                ? formatVisitorTime(firstSeen, locale)
                : t(locale, "cookieLab.unknown")
            }
            nowrap
          />
          <Fact
            label={t(locale, "cookieLab.lastSeen")}
            value={
              lastSeen
                ? formatVisitorTime(lastSeen, locale)
                : t(locale, "cookieLab.unknown")
            }
            nowrap
          />
        </dl>
        <ul className="mt-2 space-y-1 border-t border-line/70 pt-2">
          {cookies.length === 0 ? (
            <li className="text-[12px] text-ink-muted">
              {t(locale, "cookieLab.none")}
            </li>
          ) : (
            cookies.map((cookie) => (
              <li
                key={cookie.name}
                className="flex min-w-0 items-start justify-between gap-3"
              >
                <span className="shrink-0 font-mono text-[11px] text-ink">
                  {cookie.name}
                </span>
                <span className="min-w-0 break-all text-right font-mono text-[11px] leading-4 text-ink-muted">
                  {maskCookieValue(cookie.name, cookie.value)}
                </span>
              </li>
            ))
          )}
        </ul>
      </Section>

      <Section
        title={t(locale, "cookieLab.browserSection")}
        hint={t(locale, "cookieLab.browserHint")}
      >
        <BrowserSignals />
      </Section>

      <Section
        title={t(locale, "cookieLab.visitorsSection")}
        hint={t(locale, "cookieLab.visitorsHint")}
      >
        {!canEdit ? (
          <p className="text-[12px] leading-snug text-ink-muted">
            {t(locale, "cookieLab.visitorsLocked")}
          </p>
        ) : !storeWritable ? (
          <p className="text-[12px] leading-snug text-ink-muted">
            {t(locale, "cookieLab.visitorsNoKv")}
          </p>
        ) : visitors.length === 0 ? (
          <p className="text-[12px] leading-snug text-ink-muted">
            {t(locale, "cookieLab.visitorsEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {visitors.map((row) => {
              const isYou = visitorId != null && row.id === visitorId;
              const title = [row.device, formatGeo(row.geo)]
                .filter(Boolean)
                .join(" · ") || t(locale, "cookieLab.unknown");
              return (
                <li key={row.id} className="py-2 first:pt-0 last:pb-0">
                  <details className="min-w-0">
                    <summary className="flex min-w-0 cursor-pointer list-none items-start justify-between gap-2 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="min-w-0 break-words text-[13px] font-medium leading-5 text-ink [overflow-wrap:anywhere]">
                            {title}
                          </span>
                          {isYou ? (
                            <span className="shrink-0 rounded-full bg-accent/15 px-1.5 py-px text-[10px] font-medium text-accent">
                              {t(locale, "cookieLab.you")}
                            </span>
                          ) : null}
                          {row.editorName ? (
                            <span className="min-w-0 break-words text-[11px] text-ink-muted [overflow-wrap:anywhere]">
                              {row.editorName}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                          <span className="tabular-nums whitespace-nowrap">
                            {visitLabel(locale, row.visitCount)}
                          </span>
                          <span> · </span>
                          <span className="tabular-nums whitespace-nowrap">
                            {formatVisitorTime(row.lastSeen, locale)}
                          </span>
                        </span>
                      </span>
                    </summary>
                    <div className="mt-1.5 space-y-1 text-[11px] leading-4 text-ink-muted">
                      <p>
                        {t(locale, "cookieLab.firstSeen")}{" "}
                        <span className="tabular-nums whitespace-nowrap text-ink">
                          {formatVisitorTime(row.firstSeen, locale)}
                        </span>
                      </p>
                      {row.browser || row.os ? (
                        <p className="min-w-0 break-words [overflow-wrap:anywhere]">
                          {[row.browser, row.os].filter(Boolean).join(" · ")}
                        </p>
                      ) : null}
                      <p className="font-medium text-ink">
                        {t(locale, "cookieLab.paths")}
                      </p>
                      <ul className="space-y-0.5">
                        {row.paths.map((path, index) => (
                          <li
                            key={`${path}-${index}`}
                            className="break-all font-mono text-[11px] text-ink"
                          >
                            {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <p className="px-1 text-[11px] leading-snug text-ink-muted">
        {t(locale, "cookieLab.privacy")}
      </p>
    </div>
  );
}
