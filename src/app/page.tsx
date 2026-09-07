import { CountdownWidget } from "@/components/countdown-widget";
import { EmptyState } from "@/components/empty-state";
import { FlightInfoList } from "@/components/flight-info-list";
import {
  NextStopCard,
  TodaySpendCard,
  TonightStayCard,
} from "@/components/overview-cards";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { eyebrowClass, PageShell } from "@/components/page-shell";
import { getMyrToJpy } from "@/lib/exchange";
import { dateKey, formatTripSpan, tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { byDay, moneySummary } from "@/lib/spend";
import {
  buildAgenda,
  getDays,
  getPlaces,
  getSpend,
  getStays,
  getTransit,
  pickFocusDay,
  staysForDate,
  tripFlow,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const today = tokyoToday();
  const [days, places, transit, stays, spend, fx] = await Promise.all([
    getDays(),
    getPlaces(),
    getTransit(),
    getStays(),
    getSpend(),
    getMyrToJpy(),
  ]);
  const dated = days.filter((day) => day.date);
  const tripStart = dated[0]?.date ?? null;
  const tripEnd = dated[dated.length - 1]?.date ?? null;
  const hops = tripFlow(days);
  const cityFlow = hops.length > 0 ? hops.join(" → ") : "";
  const span =
    dated.length > 0 ? formatTripSpan(tripStart, tripEnd) : "Dates TBD";
  const flights = transit.filter((item) => item.mode === "Flight");
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const focus = pickFocusDay(days, today);
  const dayPlaces = focus
    ? places.filter((place) => place.dayIds.includes(focus.id))
    : [];
  const dayTransit = focus
    ? transit.filter((item) => item.dayIds.includes(focus.id))
    : [];
  const agenda = buildAgenda(dayPlaces, dayTransit);
  const nextStop =
    agenda.find((item) => item.kind !== "place" || !item.visited) ?? null;
  const lodging = focus ? staysForDate(stays, focus.date) : [];
  const dayMoney = focus
    ? moneySummary(byDay(spend, focus.id), fx.jpyPerRm)
    : { actual: 0, estimate: 0, remaining: 0 };
  const isTonight = Boolean(focus && dateKey(focus.date) === today);

  return (
    <>
      <TripCacheSync
        snapshot={{
          v: 1,
          savedAt: new Date().toISOString(),
          days,
          places,
          transit,
          stays,
        }}
      />
      <PageShell>
        <CountdownWidget start={tripStart} end={tripEnd} today={today} />

        <div>
          <p className={eyebrowClass}>Trip overview</p>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-stone-500">{span}</p>
          {cityFlow ? (
            <p className="mt-2 text-base font-medium">{cityFlow}</p>
          ) : null}
        </div>

        {focus ? (
          <div className="grid gap-3">
            <NextStopCard
              item={nextStop}
              href={`/schedule?day=${encodeURIComponent(focus.id)}`}
              dayName={focus.name}
              dayDate={focus.date}
            />
            <TonightStayCard stays={lodging} isTonight={isTonight} />
            <TodaySpendCard
              actual={dayMoney.actual}
              estimate={dayMoney.estimate}
              href="/budget"
            />
          </div>
        ) : (
          <EmptyState title="No trip days yet">
            Add days in Settings to see the next stop and tonight’s stay.
          </EmptyState>
        )}

        <FlightInfoList flights={flights} dayNames={dayNames} />
      </PageShell>
    </>
  );
}
