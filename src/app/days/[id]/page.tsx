import Link from "next/link";
import { notFound } from "next/navigation";
import { AddAgendaForm } from "@/components/add-agenda-form";
import { AgendaEditTable } from "@/components/agenda-edit-table";
import { DayCard } from "@/components/day-card";
import { DayMapLoader } from "@/components/day-map-loader";
import { EmptyState } from "@/components/empty-state";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { VisitedToggle } from "@/components/visited-toggle";
import { formatRm, formatTime } from "@/lib/format";
import { byDay, moneySummary } from "@/lib/spend";
import {
  buildAgenda,
  getDay,
  getDays,
  getPlacesForDay,
  getSpend,
  getStays,
  getTransitForDay,
  staysForDate,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const editing = mode === "edit";
  const day = await getDay(id);
  if (!day) notFound();

  const [places, transit, days, stays, spend] = await Promise.all([
    getPlacesForDay(id),
    getTransitForDay(id),
    getDays(),
    getStays(),
    getSpend(),
  ]);
  const agenda = buildAgenda(places, transit);
  const lodging = staysForDate(stays, day.date);
  const dayMoney = moneySummary(byDay(spend, id));
  const mapPins = agenda.flatMap((item) =>
    item.kind === "place" && item.lat != null && item.lng != null
      ? [{ id: item.id, name: item.name, lat: item.lat, lng: item.lng }]
      : [],
  );

  return (
    <>
      <Nav current="/" />
      <PageShell>
        <div className="space-y-3">
          <DayCard day={day} href={null} />
          <p className="px-1 text-sm text-stone-500">
            {formatRm(dayMoney.actual)} spent · {formatRm(dayMoney.estimate)}{" "}
            estimated
          </p>
        </div>

        {lodging.length > 0 ? (
          <p className="rounded-2xl bg-white px-4 py-2 text-sm text-stone-600">
            Sleeping in {lodging.map((stay) => stay.name).join(", ")}
          </p>
        ) : null}

        <section>
          {mapPins.length > 0 || day.city ? (
            <div className="mb-3">
              <DayMapLoader city={day.city} pins={mapPins} />
            </div>
          ) : null}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
              {editing ? "Edit agenda" : "Agenda"}
            </h2>
            <Link
              href={editing ? `/days/${id}` : `/days/${id}?mode=edit`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                editing
                  ? "bg-stone-200 text-stone-800"
                  : "bg-[#b42318] text-white"
              }`}
            >
              {editing ? "Done" : "Edit"}
            </Link>
          </div>

          {editing ? (
            <div className="grid gap-4">
              <AgendaEditTable
                places={places}
                transit={transit}
                dayId={day.id}
                dayDate={day.date}
              />
              <AddAgendaForm
                days={days}
                defaultDayId={day.id}
                dayDate={day.date}
              />
            </div>
          ) : agenda.length === 0 ? (
            <EmptyState title="Nothing timed yet">
              Tap Edit to add a place or transit for this day.
            </EmptyState>
          ) : (
            <ol className="relative space-y-0 border-l-2 border-stone-200 pl-5">
              {agenda.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="relative pb-5 last:pb-0">
                  <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full bg-[#b42318]" />
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-stone-500">
                          {[formatTime(item.start) ?? "Anytime", item.chip]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="flex items-start gap-1">
                          <span className="text-lg font-medium break-words">
                            {item.name}
                          </span>
                          {item.kind === "place" ? (
                            <MapsPinLink
                              name={item.name}
                              lat={item.lat}
                              lng={item.lng}
                              mapsUrl={item.mapsUrl}
                            />
                          ) : null}
                        </p>
                        {item.detail ? (
                          <p className="text-sm text-stone-600">{item.detail}</p>
                        ) : null}
                      </div>
                      {item.kind === "place" ? (
                        <VisitedToggle
                          id={item.id}
                          visited={Boolean(item.visited)}
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </PageShell>
    </>
  );
}
