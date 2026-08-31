import Link from "next/link";
import { AddDayForm } from "@/components/add-day-form";
import { CountdownWidget } from "@/components/countdown-widget";
import { DayCard } from "@/components/day-card";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { formatDay, formatRm, formatTripSpan, tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { moneySummary } from "@/lib/spend";
import {
  getDays,
  getPlaces,
  getPlacesForDay,
  getSpend,
  getTransitForDay,
  pickFocusDay,
  tripFlow,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/" />
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const [days, places, spend] = await Promise.all([
    getDays(),
    getPlaces(),
    getSpend(),
  ]);
  const hops = tripFlow(days);
  const today = tokyoToday();
  const focus = pickFocusDay(days, today);
  const focusPlaces = focus ? await getPlacesForDay(focus.id) : [];
  const focusTransit = focus ? await getTransitForDay(focus.id) : [];
  const nextPlace = focusPlaces.find((place) => !place.visited) ?? null;
  const nextTransit = focusTransit[0] ?? null;
  const visited = places.filter((place) => place.visited).length;
  const money = moneySummary(spend);
  const dated = days.filter((day) => day.date);
  const tripStart = dated[0]?.date ?? null;
  const tripEnd = dated[dated.length - 1]?.date ?? null;
  const span =
    dated.length > 0
      ? formatTripSpan(tripStart, tripEnd)
      : "Dates TBD";

  return (
    <>
      <Nav current="/" />
      <PageShell>
        <CountdownWidget start={tripStart} end={tripEnd} today={today} />

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Trip flow
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-stone-500">{span}</p>
          {hops.length > 0 ? (
            <p className="mt-2 text-base font-medium">{hops.join(" → ")}</p>
          ) : null}
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 md:max-w-xl">
          <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Places
            </p>
            <p className="mt-1 text-2xl font-medium">
              {visited}/{places.length}
            </p>
            <p className="text-sm text-stone-500">visited</p>
          </div>
          <Link
            href="/spend"
            className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Spend
            </p>
            <p className="mt-1 text-lg font-medium break-words">{formatRm(money.actual)}</p>
            <p className="text-sm text-stone-500">
              of {formatRm(money.estimate)} est.
            </p>
          </Link>
        </div>

        {focus ? (
          <Link
            href={`/days/${focus.id}`}
            className="block min-w-0 rounded-2xl border border-stone-200 bg-white p-4 md:max-w-xl"
          >
            <p className="text-xs uppercase tracking-wide text-[#b42318]">
              {dateKey(focus.date) === today ? "Today" : "Next"}
            </p>
            <p className="mt-1 font-serif text-2xl">{focus.name}</p>
            <p className="text-sm text-stone-500">
              {formatDay(focus.date)}
              {focus.city ? ` · ${focus.city}` : ""}
            </p>
            {nextTransit ? (
              <p className="mt-2 text-sm">
                Next move: {nextTransit.mode ? `${nextTransit.mode} · ` : ""}
                {nextTransit.name}
              </p>
            ) : null}
            {nextPlace ? (
              <p className="text-sm text-stone-600">
                Next stop: {nextPlace.name}
              </p>
            ) : (
              <p className="text-sm text-stone-500">No unvisited places yet</p>
            )}
          </Link>
        ) : (
          <EmptyState title="No days yet">Add a day to start the flow.</EmptyState>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
            Days
          </h2>
          {days.length === 0 ? (
            <EmptyState title="Empty itinerary">
              Add a day here, or in the Days database in Notion.
            </EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {days.map((day) => (
                <li key={day.id} className="min-w-0">
                  <DayCard day={day} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <AddDayForm />
      </PageShell>
    </>
  );
}

function dateKey(value: string | null) {
  return value ? value.slice(0, 10) : null;
}
