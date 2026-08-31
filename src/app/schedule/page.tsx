import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { ScheduleView } from "@/components/schedule-view";
import { coordsOfPlace } from "@/lib/geocode";
import { tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import {
  buildAgenda,
  getDays,
  getPlacesForDay,
  getTransitForDay,
  pickFocusDay,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/schedule" />
        <div className="mx-auto max-w-xl px-4 py-6 pb-24 md:max-w-5xl md:px-8">
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </div>
      </>
    );
  }

  const { day: dayParam } = await searchParams;
  const days = await getDays();

  if (days.length === 0) {
    return (
      <>
        <Nav current="/schedule" />
        <div className="mx-auto max-w-xl px-4 py-6 pb-24 md:max-w-5xl md:px-8">
          <EmptyState title="No days yet">
            Add trip days in{" "}
            <Link href="/settings" className="font-medium text-[#b42318]">
              Settings
            </Link>
            .
          </EmptyState>
        </div>
      </>
    );
  }

  const today = tokyoToday();
  const defaultDay = pickFocusDay(days, today) ?? days[0];
  const selectedDay =
    days.find((day) => day.id === dayParam) ?? defaultDay;

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
      <Nav current="/schedule" />
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
