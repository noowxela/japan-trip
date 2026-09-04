import { coordsOfPlace } from "@/lib/geocode";
import { buildAgenda } from "@/lib/trip";
import type { AgendaItem, Place, Transit, TripDay } from "@/lib/types";

export type SchedulePin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "sight" | "food" | "other";
  label?: string;
};

export type DayScheduleSlice = {
  agenda: AgendaItem[];
  pending: Place[];
  mapPins: SchedulePin[];
};

export function pinKind(type: string | null): SchedulePin["kind"] {
  if (type === "Food" || type === "Cafe") return "food";
  if (type === "Sight") return "sight";
  return "other";
}

export function pinsFromAgenda(
  agenda: AgendaItem[],
  pending: Place[],
): SchedulePin[] {
  return [
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
          kind: pinKind(item.chip),
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
          kind: pinKind(place.type),
        },
      ];
    }),
  ];
}

function earliestDayIndex(place: Place, days: TripDay[]) {
  let best = Infinity;
  for (const dayId of place.dayIds) {
    const index = days.findIndex((day) => day.id === dayId);
    if (index >= 0 && index < best) best = index;
  }
  return Number.isFinite(best) ? best : null;
}

export function pinsForAllDays(days: TripDay[], places: Place[]): SchedulePin[] {
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

export function buildScheduleSlices(
  days: TripDay[],
  places: Place[],
  transit: Transit[],
): Record<string, DayScheduleSlice> {
  const slices: Record<string, DayScheduleSlice> = {};
  for (const day of days) {
    const dayPlaces = places.filter((place) => place.dayIds.includes(day.id));
    const dayTransit = transit.filter((item) => item.dayIds.includes(day.id));
    const agenda = buildAgenda(dayPlaces, dayTransit);
    const pending = dayPlaces.filter((place) => place.pending);
    slices[day.id] = {
      agenda,
      pending,
      mapPins: pinsFromAgenda(agenda, pending),
    };
  }
  return slices;
}
