import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { TripMapLoader } from "@/components/trip-map-loader";
import { cityHops, getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const hops = cityHops(days);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const pins = places
    .filter((place) => place.lat != null && place.lng != null)
    .map((place) => ({
      id: place.id,
      name: place.name,
      lat: place.lat as number,
      lng: place.lng as number,
      dayId: place.dayIds[0] ?? null,
      dayName: place.dayIds[0] ? (dayNames.get(place.dayIds[0]) ?? null) : null,
    }));

  return (
    <>
      <Nav current="/map" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Flow
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Map</h1>
          {hops.length > 0 ? (
            <p className="mt-1 text-sm text-stone-600">{hops.join(" → ")}</p>
          ) : null}
        </div>
        {hops.length === 0 && pins.length === 0 ? (
          <EmptyState title="Nothing to plot yet">
            Add days with a city, and places so they can be geocoded onto the map.
          </EmptyState>
        ) : (
          <TripMapLoader hops={hops} pins={pins} />
        )}
        <p className="text-xs text-stone-500">
          City path uses Tokyo / Kyoto / Osaka centers. Pins appear after a place
          is saved and geocoded.
        </p>
      </main>
    </>
  );
}
