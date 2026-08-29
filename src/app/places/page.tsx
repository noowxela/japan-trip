import { AddPlaceForm } from "@/components/add-place-form";
import { EmptyState } from "@/components/empty-state";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { NotesForm } from "@/components/notes-form";
import { VisitedToggle } from "@/components/visited-toggle";
import { coordsOfPlace } from "@/lib/geocode";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

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
        {places.length === 0 ? (
          <EmptyState title="No places yet">
            Add a place below, or in the Places database in Notion.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {places.map((place) => (
              <li
                key={place.id}
                className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-500">
                      {[place.type, place.area].filter(Boolean).join(" · ")}
                    </p>
                    <p className="flex items-start gap-1">
                      <span className="text-lg font-medium break-words">
                        {place.name}
                      </span>
                      <MapsPinLink
                        name={place.name}
                        lat={coordsOfPlace(place)?.lat}
                        lng={coordsOfPlace(place)?.lng}
                        mapsUrl={place.mapsUrl}
                      />
                    </p>
                    <p className="text-sm text-stone-500">
                      {place.dayIds
                        .map((id) => dayNames.get(id))
                        .filter(Boolean)
                        .join(", ") || "Unscheduled"}
                    </p>
                  </div>
                  <VisitedToggle id={place.id} visited={place.visited} />
                </div>
                <NotesForm id={place.id} notes={place.notes} />
              </li>
            ))}
          </ul>
        )}
        <AddPlaceForm days={days} />
      </PageShell>
    </>
  );
}
