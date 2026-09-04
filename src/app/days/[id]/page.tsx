import Link from "next/link";
import { notFound } from "next/navigation";
import { AddAgendaForm } from "@/components/add-agenda-form";
import { AgendaEditTable } from "@/components/agenda-edit-table";
import {
  CarryOverBanner,
  DayAgendaBoard,
  PendingPanel,
} from "@/components/day-agenda-board";
import { Breadcrumb } from "@/components/breadcrumb";
import { DayCard } from "@/components/day-card";
import { DayMapLoader } from "@/components/day-map-loader";
import { DayQuickFab } from "@/components/day-quick-fab";
import { EditOnly } from "@/components/edit-session";
import { PageShell } from "@/components/page-shell";
import { getEditorSession } from "@/lib/edit-session";
import { formatRm, tokyoToday } from "@/lib/format";
import { coordsOfPlace } from "@/lib/geocode";
import { byDay, moneySummary } from "@/lib/spend";
import {
  buildAgenda,
  getDay,
  getDays,
  getPlaces,
  getPlacesForDay,
  getSpend,
  getStays,
  getTransitForDay,
  pendingFromOtherDays,
  staysForDate,
  unvisitedFromPastDays,
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
  const editor = await getEditorSession();
  const editing = mode === "edit" && editor.canEdit;
  const day = await getDay(id);
  if (!day) notFound();

  const [places, transit, days, stays, spend, allPlaces] = await Promise.all([
    getPlacesForDay(id),
    getTransitForDay(id),
    getDays(),
    getStays(),
    getSpend(),
    getPlaces(),
  ]);
  const agenda = buildAgenda(places, transit);
  const pending = places.filter((place) => place.pending);
  const lodging = staysForDate(stays, day.date);
  const dayMoney = moneySummary(byDay(spend, id));
  const today = tokyoToday();
  const carryOver = unvisitedFromPastDays(days, allPlaces, today);
  const otherPending = pendingFromOtherDays(allPlaces, id);
  const mapPins = [
    ...agenda.flatMap((item) => {
      if (item.kind !== "place" || item.lat == null || item.lng == null) {
        return [];
      }
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
    }),
    ...pending.flatMap((place) => {
      const coords = coordsOfPlace(place);
      if (!coords) return [];
      return [
        {
          id: place.id,
          name: place.name,
          lat: coords.lat,
          lng: coords.lng,
          kind:
            place.type === "Food" || place.type === "Cafe"
              ? ("food" as const)
              : place.type === "Sight"
                ? ("sight" as const)
                : ("other" as const),
        },
      ];
    }),
  ];

  return (
    <>
      <PageShell className={editing ? "" : "pb-28"}>
        <Breadcrumb
          items={[
            { href: "/", label: "Overview" },
            { href: "/schedule", label: "Schedule" },
            { label: day.name },
          ]}
        />
        <div className="space-y-3">
          <DayCard day={day} href={null} />
          <p className="px-1 text-sm text-stone-500">
            {formatRm(dayMoney.actual)} spent · {formatRm(dayMoney.estimate)}{" "}
            estimated
          </p>
        </div>

        {lodging.length > 0 ? (
          <p className="notebook-card px-4 py-2 text-sm text-stone-600">
            Sleeping in {lodging.map((stay) => stay.name).join(", ")}
          </p>
        ) : null}

        <CarryOverBanner
          places={carryOver}
          dayId={day.id}
          title="Unvisited from earlier days"
        />
        <CarryOverBanner
          places={otherPending}
          dayId={day.id}
          title="Pending from other days"
        />

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
            <EditOnly>
              <Link
                href={editing ? `/days/${id}` : `/days/${id}?mode=edit`}
                className={`notebook-btn px-4 py-1.5 text-sm font-medium ${
                  editing
                    ? "bg-sage text-stone-800"
                    : "bg-hanko text-white"
                }`}
              >
                {editing ? "Done" : "Edit"}
              </Link>
            </EditOnly>
          </div>

          {editing ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
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
              <PendingPanel
                pending={pending}
                dayId={day.id}
                dayDate={day.date}
              />
            </div>
          ) : (
            <DayAgendaBoard
              agenda={agenda}
              pending={pending}
              dayId={day.id}
              dayDate={day.date}
            />
          )}
        </section>
      </PageShell>
      {!editing ? (
        <EditOnly>
          <DayQuickFab dayId={day.id} dayDate={day.date} days={days} />
        </EditOnly>
      ) : null}
    </>
  );
}
