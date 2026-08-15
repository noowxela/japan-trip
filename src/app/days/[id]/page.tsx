import { notFound } from "next/navigation";
import { AddPlaceForm } from "@/components/add-place-form";
import { AddTransitForm } from "@/components/add-transit-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { VisitedToggle } from "@/components/visited-toggle";
import { formatDay, formatTime, formatYen } from "@/lib/format";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <>
      <Nav current="/" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            {formatDay(day.date)}
            {day.city ? ` · ${day.city}` : ""}
          </p>
          <h1 className="font-serif text-3xl tracking-tight">{day.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {formatYen(dayMoney.actual)} spent · {formatYen(dayMoney.estimate)}{" "}
            estimated
          </p>
        </div>

        {lodging.length > 0 ? (
          <p className="rounded-full bg-white px-4 py-2 text-sm text-stone-600">
            Sleeping in {lodging.map((stay) => stay.name).join(", ")}
          </p>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-stone-500">
            Agenda
          </h2>
          {agenda.length === 0 ? (
            <EmptyState title="Nothing timed yet">
              Add a place or transit below. Set Start to order the day.
            </EmptyState>
          ) : (
            <ol className="relative space-y-0 border-l-2 border-stone-200 pl-5">
              {agenda.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="relative pb-5">
                  <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full bg-[#b42318]" />
                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-stone-500">
                          {[formatTime(item.start) ?? "Anytime", item.chip]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="text-lg font-medium">{item.name}</p>
                        {item.detail ? (
                          <p className="text-sm text-stone-600">{item.detail}</p>
                        ) : null}
                        {item.mapsUrl ? (
                          <a
                            href={item.mapsUrl}
                            className="text-sm text-[#b42318] underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Maps
                          </a>
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

        <AddPlaceForm days={days} defaultDayId={day.id} />
        <AddTransitForm days={days} defaultDayId={day.id} />
      </main>
    </>
  );
}
