import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ScheduleView } from "@/components/schedule-view";
import { coordsOfPlace } from "@/lib/geocode";
import { tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import {
  buildAgenda,
  getDays,
  getPlaces,
  getPlacesForDay,
  getTransitForDay,
  pickFocusDay,
} from "@/lib/trip";
import type { Place, TripDay } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
          <p className="mt-4 text-center text-sm">
            <Link href="/" className="font-medium text-hanko">
              Back to Overview
            </Link>
          </p>
        </div>
      </>
    );
  }

  const { day: dayParam } = await searchParams;
  const days = await getDays();

  if (days.length === 0) {
    return (
      <>
        <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
          <EmptyState title="No days yet">
            Add trip days in{" "}
            <Link href="/settings" className="font-medium text-hanko">
              Settings
            </Link>
            .
          </EmptyState>
        </div>
      </>
    );
  }

  const today = tokyoToday();

  if (dayParam === "all") {
    const places = await getPlaces();
    return (
      <>
        <ScheduleView
          days={days}
          selectedDay={null}
          agenda={[]}
          pending={[]}
          mapPins={pinsForAllDays(days, places)}
          places={places}
        />
      </>
    );
  }

  const selectedDay =
    days.find((day) => day.id === dayParam) ??
    pickFocusDay(days, today) ??
    days[0];
  if (!selectedDay) return null;

  const [places, transit] = await Promise.all([
    getPlacesForDay(selectedDay.id),
    getTransitForDay(selectedDay.id),
  ]);
  const agenda = buildAgenda(places, transit);
  const pending = places.filter((place) => place.pending);
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
      <ScheduleView
        days={days}
        selectedDay={selectedDay}
        agenda={agenda}
        pending={pending}
        mapPins={mapPins}
      />
    </>
  );
}

function pinKind(type: string | null) {
  if (type === "Food" || type === "Cafe") return "food" as const;
  if (type === "Sight") return "sight" as const;
  return "other" as const;
}

function earliestDayIndex(place: Place, days: TripDay[]) {
  let best = Infinity;
  for (const dayId of place.dayIds) {
    const index = days.findIndex((day) => day.id === dayId);
    if (index >= 0 && index < best) best = index;
  }
  return Number.isFinite(best) ? best : null;
}

function pinsForAllDays(days: TripDay[], places: Place[]) {
  return places.flatMap((place) => {
    const dayIndex = earliestDayIndex(place, days);
    if (dayIndex == null) return [];
    const coords = coordsOfPlace(place);
    if (!coords) return [];
    return [
      {
        id: place.id,
        name: place.name,
        lat: coords.lat,
        lng: coords.lng,
        kind: pinKind(place.type),
        label: `D${dayIndex + 1}`,
      },
    ];
  });
}
