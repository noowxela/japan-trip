import { cache } from "react";
import { dateKey } from "@/lib/format";
import { coordsOfPlace } from "@/lib/geocode";
import {
  checkboxOf,
  dateOf,
  ds,
  numberOf,
  queryAll,
  relationIdsOf,
  richTextOf,
  selectOf,
  statusOf,
  titleOf,
  urlOf,
} from "@/lib/notion";
import { parseSpendCurrency } from "@/lib/spend";
import type {
  AgendaItem,
  Place,
  SpendItem,
  Stay,
  Transit,
  TripDay,
} from "@/lib/types";
import { CITY_COORDS } from "@/lib/types";

function parseDay(page: Awaited<ReturnType<typeof queryAll>>[number]): TripDay {
  return {
    id: page.id,
    name: titleOf(page),
    date: dateOf(page, "Date"),
    city: selectOf(page, "City"),
    status: statusOf(page, "Status"),
  };
}

function parsePlace(page: Awaited<ReturnType<typeof queryAll>>[number]): Place {
  return {
    id: page.id,
    name: titleOf(page),
    type: selectOf(page, "Type"),
    mapsUrl: urlOf(page, "Maps URL"),
    notes: richTextOf(page, "Notes"),
    visited: checkboxOf(page, "Visited"),
    dayIds: relationIdsOf(page, "Day"),
    start: dateOf(page, "Start"),
    lat: numberOf(page, "Lat"),
    lng: numberOf(page, "Lng"),
    pending: checkboxOf(page, "Pending"),
  };
}

function parseStay(page: Awaited<ReturnType<typeof queryAll>>[number]): Stay {
  return {
    id: page.id,
    name: titleOf(page),
    checkIn: dateOf(page, "Check-in"),
    checkOut: dateOf(page, "Check-out"),
    address: richTextOf(page, "Address"),
    bookingUrl: urlOf(page, "Booking URL"),
    confirmation: richTextOf(page, "Confirmation"),
  };
}

function parseTransit(page: Awaited<ReturnType<typeof queryAll>>[number]): Transit {
  return {
    id: page.id,
    name: titleOf(page),
    mode: selectOf(page, "Mode"),
    from: richTextOf(page, "From"),
    to: richTextOf(page, "To"),
    date: dateOf(page, "Date"),
    bookingUrl: urlOf(page, "Booking URL"),
    dayIds: relationIdsOf(page, "Day"),
    start: dateOf(page, "Start") ?? dateOf(page, "Date"),
    order: numberOf(page, "Order"),
  };
}

function parseSpend(page: Awaited<ReturnType<typeof queryAll>>[number]): SpendItem {
  return {
    id: page.id,
    name: titleOf(page),
    amount: numberOf(page, "Amount") ?? 0,
    currency: parseSpendCurrency(selectOf(page, "Currency")),
    kind: selectOf(page, "Kind"),
    category: selectOf(page, "Category"),
    notes: richTextOf(page, "Notes"),
    dayIds: relationIdsOf(page, "Day"),
  };
}

export const getDays = cache(async () => {
  const pages = await queryAll(ds("DAYS"), {
    sorts: [{ property: "Date", direction: "ascending" }],
  });
  return pages.map(parseDay);
});

export const getPlaces = cache(async () => {
  const pages = await queryAll(ds("PLACES"));
  return pages.map(parsePlace);
});

export const getStays = cache(async () => {
  const pages = await queryAll(ds("STAYS"), {
    sorts: [{ property: "Check-in", direction: "ascending" }],
  });
  return pages.map(parseStay);
});

export const getTransit = cache(async () => {
  const pages = await queryAll(ds("TRANSIT"), {
    sorts: [{ property: "Date", direction: "ascending" }],
  });
  return pages.map(parseTransit);
});

export const getSpend = cache(async () => {
  const pages = await queryAll(ds("SPEND"));
  return pages.map(parseSpend);
});

export async function getDay(id: string) {
  const days = await getDays();
  return days.find((day) => day.id === id) ?? null;
}

export async function getPlacesForDay(dayId: string) {
  const places = await getPlaces();
  return places.filter((place) => place.dayIds.includes(dayId));
}

export async function getTransitForDay(dayId: string) {
  const items = await getTransit();
  return items.filter((item) => item.dayIds.includes(dayId));
}

export function cityHops(days: TripDay[]) {
  const hops: string[] = [];
  for (const day of days) {
    if (!day.date || !day.city) continue;
    if (hops[hops.length - 1] !== day.city) hops.push(day.city);
  }
  return hops;
}

export function hopPathCoords(
  hops: string[],
  days: TripDay[],
  places: Place[],
) {
  const points: [number, number][] = [];
  for (const city of hops) {
    if (CITY_COORDS[city]) {
      points.push(CITY_COORDS[city]);
      continue;
    }
    const dayIds = new Set(
      days.filter((day) => day.city === city).map((day) => day.id),
    );
    const place = places.find(
      (item) =>
        item.dayIds.some((id) => dayIds.has(id)) && coordsOfPlace(item),
    );
    const coords = place ? coordsOfPlace(place) : null;
    if (coords) points.push([coords.lat, coords.lng]);
  }
  return points;
}

export function tripFlow(days: TripDay[]) {
  const hops = cityHops(days);
  return hops.map((city, index) =>
    hops.slice(0, index).includes(city) ? `${city} fly back` : city,
  );
}

export function pickFocusDay(days: TripDay[], today: string) {
  const dated = days.filter((day) => day.date);
  return (
    dated.find((day) => dateKey(day.date)! >= today) ?? dated[0] ?? days[0] ?? null
  );
}

export function staysForDate(stays: Stay[], date: string | null) {
  const day = dateKey(date);
  if (!day) return [];
  return stays.filter((stay) => {
    const checkIn = dateKey(stay.checkIn);
    const checkOut = dateKey(stay.checkOut);
    if (checkIn && checkOut) return day >= checkIn && day < checkOut;
    if (checkIn) return day >= checkIn;
    return false;
  });
}

function sortAgenda(a: AgendaItem, b: AgendaItem) {
  const startA = a.start ?? "9999";
  const startB = b.start ?? "9999";
  if (startA !== startB) return startA.localeCompare(startB);
  const orderA = a.order ?? 9999;
  const orderB = b.order ?? 9999;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

export function listCounts(
  places: Place[],
  stays: Stay[],
  transit: Transit[],
) {
  return {
    places: places.length,
    pending: places.filter((place) => place.pending).length,
    stays: stays.length,
    transit: transit.length,
  };
}

export function unvisitedFromPastDays(
  days: TripDay[],
  places: Place[],
  today: string,
) {
  const pastDayIds = new Set(
    days
      .filter((day) => day.date && dateKey(day.date)! < today)
      .map((day) => day.id),
  );
  return places.filter(
    (place) =>
      !place.visited &&
      !place.pending &&
      place.dayIds.some((id) => pastDayIds.has(id)),
  );
}

export function pendingForDay(places: Place[], dayId: string) {
  return places.filter(
    (place) => place.pending && place.dayIds.includes(dayId),
  );
}

export function pendingFromOtherDays(places: Place[], dayId: string) {
  return places.filter(
    (place) => place.pending && !place.dayIds.includes(dayId),
  );
}

export function buildAgenda(places: Place[], transit: Transit[]): AgendaItem[] {
  const items: AgendaItem[] = [
    ...places
      .filter((place) => !place.pending)
      .map((place) => {
        const coords = coordsOfPlace(place);
        return {
          id: place.id,
          kind: "place" as const,
          name: place.name,
          chip: place.type,
          detail: "",
          start: place.start,
          order: null,
          visited: place.visited,
          mapsUrl: place.mapsUrl,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
      }),
    ...transit.map((item) => ({
      id: item.id,
      kind: "transit" as const,
      name: item.name,
      chip: item.mode,
      detail: [item.from, item.to].filter(Boolean).join(" → "),
      start: item.start,
      order: item.order,
    })),
  ];
  return items.sort(sortAgenda);
}
