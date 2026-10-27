import Link from "next/link";
import { OverviewExpenseFab } from "@/components/add-spend-form";
import { EditorLockButton } from "@/components/editor-lock-button";
import { EmptyState } from "@/components/empty-state";
import { FlightInfoList } from "@/components/flight-info-list";
import { NotionNotReady } from "@/components/notion-not-ready";
import {
  NextStopBanner,
  TodaySpendRow,
  TonightStayRows,
  TripCompleteRow,
} from "@/components/overview-cards";
import { PageHeader, SummaryStrip } from "@/components/compact";
import { QuickExpenseTripSync } from "@/components/quick-expense-provider";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { PageShell } from "@/components/page-shell";
import { getMyrToJpy } from "@/lib/exchange";
import { dateKey, tokyoToday } from "@/lib/format";
import { labelCity, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { formatOverviewSummaryLine } from "@/lib/overview-summary";
import { byDay, moneySummary } from "@/lib/spend";
import type { AgendaItem } from "@/lib/types";
import { makeTripSnapshot } from "@/lib/trip-cache";
import {
  buildAgenda,
  getDays,
  getEditorNames,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
  nextAgendaItem,
  pickFocusDay,
  staysForDate,
  tripFlow,
  tripPhase,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
  const today = tokyoToday();
  const now = new Date();
  const [days, places, transit, stays, spend, prep, fx, people] =
    await Promise.all([
      getDays(),
      getPlaces(),
      getTransit(),
      getStays(),
      getSpend(),
      getPrep(),
      getMyrToJpy(),
      getEditorNames(),
    ]);
  const dated = days.filter((day) => day.date);
  const tripStart = dated[0]?.date ?? null;
  const tripEnd = dated[dated.length - 1]?.date ?? null;
  const hops = tripFlow(days);
  const cityFlow =
    hops.length > 0
      ? hops.map((city) => labelCity(locale, city) ?? city).join(" → ")
      : "";
  const summary = formatOverviewSummaryLine({
    today,
    tripStart,
    tripEnd,
    cityFlow,
    locale,
    dayCount: dated.length,
  });
  const flights = transit.filter((item) => item.mode === "Flight");
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const phase = tripPhase(days, today);
  const focus = pickFocusDay(days, today);
  const dayPlaces = focus
    ? places.filter((place) => place.dayIds.includes(focus.id))
    : [];
  const dayTransit = focus
    ? transit.filter((item) => item.dayIds.includes(focus.id))
    : [];
  const agenda = buildAgenda(dayPlaces, dayTransit);
  const isFocusToday = Boolean(focus && dateKey(focus.date) === today);
  const next = nextAgendaItem(agenda, { now, isToday: isFocusToday });
  const lodging = focus ? staysForDate(stays, focus.date) : [];
  const dayMoney = focus
    ? moneySummary(byDay(spend, focus.id), fx.jpyPerRm)
    : { actual: 0, estimate: 0, remaining: 0 };
  const isTonight = Boolean(focus && dateKey(focus.date) === today);

  let nextDayItem: AgendaItem | null = null;
  let nextDayName: string | undefined;
  let nextDayHref: string | undefined;
  if (isFocusToday && !next && focus) {
    const focusIdx = dated.findIndex((day) => day.id === focus.id);
    const following = focusIdx >= 0 ? dated[focusIdx + 1] : null;
    if (following) {
      const followingAgenda = buildAgenda(
        places.filter((place) => place.dayIds.includes(following.id)),
        transit.filter((item) => item.dayIds.includes(following.id)),
      );
      const followingNext = nextAgendaItem(followingAgenda, {
        now,
        isToday: false,
      });
      if (followingNext) {
        nextDayItem = followingNext.item;
        nextDayName = following.name;
        nextDayHref = `/schedule?day=${encodeURIComponent(following.id)}`;
      }
    }
  }

  return (
    <>
      <TripCacheSync
        snapshot={makeTripSnapshot({
          days,
          places,
          transit,
          stays,
          spend,
          prep,
        })}
      />
      <QuickExpenseTripSync days={days} people={people} />
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "overview.eyebrow")}
          title={t(locale, "overview.title")}
          action={
            <div className="flex items-center gap-1">
              <Link
                href="/phrases"
                aria-label={t(locale, "phrases.navAria")}
                className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-ink-muted no-underline hover:text-ink"
              >
                <span aria-hidden className="text-[14px]">
                  あ
                </span>
                {t(locale, "phrases.navShort")}
              </Link>
              <EditorLockButton />
            </div>
          }
        />

        <SummaryStrip>{summary}</SummaryStrip>

        {phase === "after" ? (
          <div className="grid gap-2">
            <TripCompleteRow dayCount={dated.length} href="/budget" />
            <TodaySpendRow
              actual={dayMoney.actual}
              estimate={dayMoney.estimate}
              href="/budget"
            />
          </div>
        ) : focus ? (
          <div className="grid gap-2">
            <NextStopBanner
              item={next?.item ?? null}
              status={next?.status ?? "next"}
              done={isFocusToday && !next}
              href={`/schedule?day=${encodeURIComponent(focus.id)}`}
              dayName={focus.name}
              dayDate={focus.date}
              nextDayItem={nextDayItem}
              nextDayName={nextDayName}
              nextDayHref={nextDayHref}
            />
            <TonightStayRows stays={lodging} isTonight={isTonight} />
            <TodaySpendRow
              actual={dayMoney.actual}
              estimate={dayMoney.estimate}
              href="/budget"
            />
          </div>
        ) : (
          <EmptyState title={t(locale, "overview.noDaysTitle")}>
            {t(locale, "overview.noDaysBody")}
          </EmptyState>
        )}

        <FlightInfoList flights={flights} dayNames={dayNames} />

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
          <Link href="/schedule" className="font-medium text-ink-muted no-underline">
            {t(locale, "common.openSchedule")}
          </Link>
          <Link href="/lists" className="font-medium text-ink-muted no-underline">
            {t(locale, "lists.title")}
          </Link>
          <Link href="/prep" className="font-medium text-ink-muted no-underline">
            {t(locale, "prep.title")}
          </Link>
          <Link href="/phrases" className="font-medium text-ink-muted no-underline">
            {t(locale, "phrases.title")}
          </Link>
        </div>
      </PageShell>
      <OverviewExpenseFab
        days={days}
        people={people}
        defaultDayId={focus?.id ?? ""}
      />
    </>
  );
}
