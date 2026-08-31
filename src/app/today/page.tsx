import Link from "next/link";
import {
  CarryOverBanner,
  DayAgendaBoard,
} from "@/components/day-agenda-board";
import { DayMapLoader } from "@/components/day-map-loader";
import { DayQuickFab } from "@/components/day-quick-fab";
import { EmptyState } from "@/components/empty-state";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { formatDay, formatRm, formatTime, tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { byDay, moneySummary } from "@/lib/spend";
import { coordsOfPlace } from "@/lib/geocode";
import {
  buildAgenda,
  getDays,
  getPlaces,
  getPlacesForDay,
  getSpend,
  getStays,
  getTransitForDay,
  pickFocusDay,
  staysForDate,
  unvisitedFromPastDays,
  pendingFromOtherDays,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/today" />
        <PageShell>
          <EmptyState title="Notion is not ready">
            Connect Notion to use today view.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const today = tokyoToday();
  const [days, places, stays, spend] = await Promise.all([
    getDays(),
    getPlaces(),
    getStays(),
    getSpend(),
  ]);
  const focus = pickFocusDay(days, today);
  if (!focus) {
    return (
      <>
        <Nav current="/today" />
        <PageShell>
          <EmptyState title="No trip days yet">Add a day to get started.</EmptyState>
        </PageShell>
      </>
    );
  }

  const [dayPlaces, transit] = await Promise.all([
    getPlacesForDay(focus.id),
    getTransitForDay(focus.id),
  ]);
  const agenda = buildAgenda(dayPlaces, transit);
  const pending = dayPlaces.filter((place) => place.pending);
  const nextPlace = dayPlaces.find((place) => !place.visited && !place.pending);
  const nextTransit = transit[0] ?? null;
  const lodging = staysForDate(stays, focus.date);
  const dayMoney = moneySummary(byDay(spend, focus.id));
  const carryOver = unvisitedFromPastDays(days, places, today);
  const otherPending = pendingFromOtherDays(places, focus.id);
  const mapPins = agenda.flatMap((item) => {
    if (item.kind !== "place" || item.lat == null || item.lng == null) return [];
    return [
      {
        id: item.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        kind:
          item.chip === "Food" || item.chip === "Cafe"
            ? ("food" as const)
            : item.chip === "Sight"
              ? ("sight" as const)
              : ("other" as const),
      },
    ];
  });

  return (
    <>
      <Nav current="/today" />
      <PageShell className="pb-28">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            {dateKey(focus.date) === today ? "Today" : "Next up"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-serif text-3xl tracking-tight">{focus.name}</h1>
            <StatusBadge status={focus.status} />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {formatDay(focus.date)}
            {focus.city ? ` · ${focus.city}` : ""}
          </p>
        </div>

        {(nextPlace || nextTransit) && (
          <section className="rounded-2xl border border-[#b42318]/30 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-[#b42318]">
              Up next
            </p>
            {nextTransit ? (
              <p className="mt-2 text-sm">
                {formatTime(nextTransit.start) ?? "Anytime"} · {nextTransit.mode}{" "}
                · {nextTransit.name}
              </p>
            ) : null}
            {nextPlace ? (
              <p className="mt-1 flex items-start gap-1 text-lg font-medium">
                <span>{nextPlace.name}</span>
                <MapsPinLink
                  name={nextPlace.name}
                  lat={coordsOfPlace(nextPlace)?.lat}
                  lng={coordsOfPlace(nextPlace)?.lng}
                  mapsUrl={nextPlace.mapsUrl}
                />
              </p>
            ) : null}
            <Link
              href={`/days/${focus.id}`}
              className="mt-3 inline-block text-sm font-medium text-[#b42318]"
            >
              Full day agenda →
            </Link>
          </section>
        )}

        {lodging.length > 0 ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-600">
            Sleeping in {lodging.map((stay) => stay.name).join(", ")}
          </p>
        ) : null}

        <p className="text-sm text-stone-500">
          {formatRm(dayMoney.actual)} spent · {formatRm(dayMoney.estimate)} estimated
        </p>

        {mapPins.length > 0 || focus.city ? (
          <DayMapLoader city={focus.city} pins={mapPins} />
        ) : null}

        <CarryOverBanner
          places={carryOver}
          dayId={focus.id}
          title="Unvisited from earlier days"
        />
        <CarryOverBanner
          places={otherPending}
          dayId={focus.id}
          title="Pending from other days"
        />

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
            Agenda
          </h2>
          <DayAgendaBoard
            agenda={agenda}
            pending={pending}
            dayId={focus.id}
            dayDate={focus.date}
          />
        </section>
      </PageShell>
      <DayQuickFab dayId={focus.id} dayDate={focus.date} days={days} />
    </>
  );
}

function dateKey(value: string | null) {
  return value ? value.slice(0, 10) : null;
}
