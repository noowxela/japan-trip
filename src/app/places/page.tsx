import Link from "next/link";
import { AddPlaceForm } from "@/components/add-place-form";
import { EmptyState } from "@/components/empty-state";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Nav } from "@/components/nav";
import { NotesForm } from "@/components/notes-form";
import { PageShell } from "@/components/page-shell";
import { PlaceFilters } from "@/components/place-filters";
import { VisitedToggle } from "@/components/visited-toggle";
import { coordsOfPlace } from "@/lib/geocode";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const dayById = new Map(days.map((day) => [day.id, day]));

  return (
    <>
      <Nav current="/lists" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Guide
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Places</h1>
        </div>
        <ListsSubNav current="/places" />
        {places.length === 0 ? (
          <EmptyState title="No places yet">
            Add a place below, or in the Places database in Notion.
          </EmptyState>
        ) : (
          <PlaceFilters places={places}>
            {(filtered) =>
              filtered.length === 0 ? (
                <EmptyState title="No matches">Try another filter.</EmptyState>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((place) => (
                    <li
                      key={place.id}
                      className={`min-w-0 rounded-2xl border bg-white p-4 ${
                        place.pending
                          ? "border-[#ea580c]/40 bg-[#ea580c]/5"
                          : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-stone-500">{place.type}</p>
                            {place.pending ? (
                              <span className="rounded-full bg-[#ea580c]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#ea580c]">
                                Maybe
                              </span>
                            ) : null}
                          </div>
                          <p className="flex items-start gap-1">
                            <span className="text-lg font-medium break-words">
                              {place.name}
                            </span>
                            <MapsPinLink
                              name={place.name}
                              lat={coordsOfPlace(place)?.lat}
                              lng={coordsOfPlace(place)?.lng}
                              mapsUrl={place.mapsUrl}
                              tone={
                                place.type === "Food" || place.type === "Cafe"
                                  ? "food"
                                  : "sight"
                              }
                            />
                          </p>
                          <p className="text-sm text-stone-500">
                            {place.dayIds.length > 0 ? (
                              place.dayIds.map((id, index) => {
                                const day = dayById.get(id);
                                if (!day) return null;
                                return (
                                  <span key={id}>
                                    {index > 0 ? ", " : null}
                                    <Link
                                      href={`/days/${id}`}
                                      className="text-[#b42318] underline"
                                    >
                                      {day.name}
                                    </Link>
                                  </span>
                                );
                              })
                            ) : (
                              "Unscheduled"
                            )}
                          </p>
                        </div>
                        <VisitedToggle id={place.id} visited={place.visited} />
                      </div>
                      <NotesForm id={place.id} notes={place.notes} />
                    </li>
                  ))}
                </ul>
              )
            }
          </PlaceFilters>
        )}
        <AddPlaceForm days={days} />
      </PageShell>
    </>
  );
}
