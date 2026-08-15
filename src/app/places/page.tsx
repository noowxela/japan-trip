import { AddPlaceForm } from "@/components/add-place-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { NotesForm } from "@/components/notes-form";
import { VisitedToggle } from "@/components/visited-toggle";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <Nav current="/lists" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
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
          <ul className="space-y-3">
            {places.map((place) => (
              <li
                key={place.id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-stone-500">
                      {[place.type, place.area].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-lg font-medium">{place.name}</p>
                    <p className="text-sm text-stone-500">
                      {place.dayIds
                        .map((id) => dayNames.get(id))
                        .filter(Boolean)
                        .join(", ") || "Unscheduled"}
                    </p>
                    {place.mapsUrl ? (
                      <a
                        href={place.mapsUrl}
                        className="text-sm text-[#b42318] underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Maps
                      </a>
                    ) : null}
                  </div>
                  <VisitedToggle id={place.id} visited={place.visited} />
                </div>
                <NotesForm id={place.id} notes={place.notes} />
              </li>
            ))}
          </ul>
        )}
        <AddPlaceForm days={days} />
      </main>
    </>
  );
}
