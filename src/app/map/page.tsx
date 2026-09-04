import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { TripMapLoader } from "@/components/trip-map-loader";
import { coordsOfPlace } from "@/lib/geocode";
import { cityHops, getDays, getPlaces, hopPathCoords } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const hops = cityHops(days);
  const hopPoints = hopPathCoords(hops, days, places);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const pins = places.flatMap((place) => {
    const coords = coordsOfPlace(place);
    if (!coords) return [];
    return [
      {
        id: place.id,
        name: place.name,
        lat: coords.lat,
        lng: coords.lng,
        dayId: place.dayIds[0] ?? null,
        dayName: place.dayIds[0] ? (dayNames.get(place.dayIds[0]) ?? null) : null,
      },
    ];
  });

  return (
    <>
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">
            Flow
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Map</h1>
          {hops.length > 0 ? (
            <p className="mt-1 text-sm text-stone-600">{hops.join(" → ")}</p>
          ) : null}
        </div>
        {hops.length === 0 && pins.length === 0 ? (
          <EmptyState title="Nothing to plot yet">
            Add days with a city, and places so they can be geocoded onto the map.
          </EmptyState>
        ) : (
          <TripMapLoader hops={hops} hopPoints={hopPoints} pins={pins} />
        )}
        <p className="text-xs text-stone-500">
          City path uses known centers and geocoded places for other cities. Pins
          appear after a place is saved and geocoded.
        </p>
      </PageShell>
    </>
  );
}
