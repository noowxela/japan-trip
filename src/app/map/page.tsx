import { EmptyState } from "@/components/empty-state";
import { NotionNotReady } from "@/components/notion-not-ready";
import { TripMapLoader } from "@/components/trip-map-loader";
import type { TripMapDay, TripMapPin } from "@/components/trip-map";
import { coordsOfPlace } from "@/lib/geocode";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { pinKind } from "@/lib/schedule-pins";
import { cityHops, getDays, getPlaces, hopPathCoords } from "@/lib/trip";

export const dynamic = "force-dynamic";

function buildTripPins(
  days: Awaited<ReturnType<typeof getDays>>,
  places: Awaited<ReturnType<typeof getPlaces>>,
): TripMapPin[] {
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const dayOrder = new Map(days.map((day, index) => [day.id, index]));
  const dayCity = new Map(days.map((day) => [day.id, day.city]));
  const counters = new Map<string, number>();

  const withCoords = places
    .map((place) => {
      const coords = coordsOfPlace(place);
      if (!coords) return null;
      const dayId = place.dayIds[0] ?? null;
      return { place, coords, dayId };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => {
      const ai = a.dayId != null ? (dayOrder.get(a.dayId) ?? 999) : 999;
      const bi = b.dayId != null ? (dayOrder.get(b.dayId) ?? 999) : 999;
      if (ai !== bi) return ai - bi;
      return (a.place.start ?? "").localeCompare(b.place.start ?? "");
    });

  return withCoords.map(({ place, coords, dayId }) => {
    const kind = pinKind(place.type);
    let sightNumber: number | null = null;
    if (kind === "sight" && dayId) {
      const next = (counters.get(dayId) ?? 0) + 1;
      counters.set(dayId, next);
      sightNumber = next;
    }
    return {
      id: place.id,
      name: place.name,
      lat: coords.lat,
      lng: coords.lng,
      dayId,
      dayName: dayId ? (dayNames.get(dayId) ?? null) : null,
      kind,
      visited: place.visited,
      sightNumber,
      start: place.start,
      type: place.type,
      city: dayId ? (dayCity.get(dayId) ?? null) : null,
      mapsUrl: place.mapsUrl,
    };
  });
}

function buildSheetDays(
  days: Awaited<ReturnType<typeof getDays>>,
  places: Awaited<ReturnType<typeof getPlaces>>,
): TripMapDay[] {
  return days.map((day) => ({
    id: day.id,
    name: day.name,
    date: day.date,
    city: day.city,
    stopCount: places.filter(
      (place) => place.dayIds.includes(day.id) && !place.pending,
    ).length,
  }));
}

export default async function MapPage() {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
  const [days, places] = await Promise.all([getDays(), getPlaces()]);
  const hops = cityHops(days);
  const hopPoints = hopPathCoords(hops, days, places);
  const pins = buildTripPins(days, places);
  const sheetDays = buildSheetDays(days, places);

  if (hops.length === 0 && pins.length === 0) {
    return (
      <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 pb-[var(--tab-bar-height)] pt-[max(1.5rem,env(safe-area-inset-top))]">
        <EmptyState title={t(locale, "map.empty")}>
          {t(locale, "map.emptyBody")}
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="fixed inset-x-0 top-0 bottom-[var(--tab-bar-height,4.25rem)] z-10 overflow-hidden">
      <TripMapLoader
        hops={hops}
        hopPoints={hopPoints}
        pins={pins}
        days={sheetDays}
      />
    </main>
  );
}
