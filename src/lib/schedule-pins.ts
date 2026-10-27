import { dateKey, tokyoToday } from "@/lib/format";
import { coordsOfPlace, coordsOfStay } from "@/lib/geocode";
import {
  buildAgenda,
  pickFocusDay,
  staysForDate,
  tripPhase,
} from "@/lib/trip-core";
import type { TripSnapshot } from "@/lib/trip-cache";
import type { AgendaItem, Place, Stay, Transit, TripDay } from "@/lib/types";

export type SchedulePin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "sight" | "food" | "other" | "stay";
  label?: string;
};

export type DayScheduleSlice = {
  agenda: AgendaItem[];
  pending: Place[];
  mapPins: SchedulePin[];
  stays: Stay[];
  transit: Transit[];
  places: Place[];
};

export function pinKind(type: string | null): SchedulePin["kind"] {
  if (type === "Food" || type === "Cafe") return "food";
  if (type === "Sight") return "sight";
  return "other";
}

export function sightNumbersById(
  pins: { id: string; kind: string; label?: string }[],
): Map<string, number> {
  const numbers = new Map<string, number>();
  let n = 0;
  for (const pin of pins) {
    if (pin.label || pin.kind !== "sight") continue;
    numbers.set(pin.id, ++n);
  }
  return numbers;
}

export function sightNumbersFromAgenda(agenda: AgendaItem[]): Map<string, number> {
  return sightNumbersById(
    agenda.flatMap((item) => {
      if (item.kind !== "place" || item.lat == null || item.lng == null) {
        return [];
      }
      return [{ id: item.id, kind: pinKind(item.chip) }];
    }),
  );
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

export function stayPinsForDate(stays: Stay[], date: string | null): SchedulePin[] {
  return staysForDate(stays, date).flatMap((stay) => {
    const coords = coordsOfStay(stay);
    if (!coords) return [];
    return [
      {
        id: stay.id,
        name: stay.name,
        lat: coords.lat,
        lng: coords.lng,
        kind: "stay" as const,
        label: "Stay",
      },
    ];
  });
}

export function mapPinsForDay(
  agenda: AgendaItem[],
  pending: Place[],
  stays: Stay[] = [],
  date: string | null = null,
): SchedulePin[] {
  return [...pinsFromAgenda(agenda, pending), ...stayPinsForDate(stays, date)];
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
  stays: Stay[] = [],
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
      mapPins: mapPinsForDay(agenda, pending, stays, day.date),
      stays: staysForDate(stays, day.date),
      transit: dayTransit,
      places: dayPlaces,
    };
  }
  return slices;
}

/** Resolve `day=today` (or implicit today): before→first, during→today, after→last. */
export function resolveTodayDayId(days: TripDay[], today = tokyoToday()) {
  const dated = days.filter((day) => day.date);
  if (dated.length === 0) return days[0]?.id ?? null;
  const phase = tripPhase(days, today);
  if (phase === "before") return dated[0].id;
  if (phase === "after") return dated[dated.length - 1].id;
  const match = dated.find((day) => dateKey(day.date) === today);
  return match?.id ?? pickFocusDay(days, today)?.id ?? dated[0].id;
}

export function schedulePropsFromSnapshot(
  snapshot: TripSnapshot,
  dayParam?: string,
  opts?: { preferTodayDuringTrip?: boolean },
) {
  const { days, places, transit, stays } = snapshot;
  if (days.length === 0) return null;
  const today = tokyoToday();
  const phase = tripPhase(days, today);
  const focusDay = pickFocusDay(days, today) ?? days[0];

  let initialDayId: string;
  if (dayParam === "all") {
    initialDayId = "all";
  } else if (dayParam === "today") {
    initialDayId = resolveTodayDayId(days, today) ?? focusDay.id;
  } else if (dayParam && days.some((day) => day.id === dayParam)) {
    initialDayId = dayParam;
  } else if (!dayParam && opts?.preferTodayDuringTrip && phase === "during") {
    initialDayId = resolveTodayDayId(days, today) ?? focusDay.id;
  } else {
    initialDayId = focusDay.id;
  }

  const selectedDay =
    initialDayId === "all"
      ? null
      : (days.find((day) => day.id === initialDayId) ?? null);
  const isSelectedToday = Boolean(
    selectedDay && dateKey(selectedDay.date) === today,
  );
  const nowModeAllowed = phase === "during" && isSelectedToday;

  return {
    days,
    places,
    byDay: buildScheduleSlices(days, places, transit, stays),
    allPins: pinsForAllDays(days, places),
    initialDayId,
    phase,
    nowModeAllowed,
    today,
  };
}
