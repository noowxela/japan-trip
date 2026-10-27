import { dateKey } from "@/lib/format";
import { coordsOfPlace } from "@/lib/geocode";
import type { AgendaItem, Place, Stay, Transit, TripDay } from "@/lib/types";

export function tripPhase(
  days: TripDay[],
  today: string,
): "before" | "during" | "after" | "none" {
  const dated = days.filter((day) => day.date);
  if (dated.length === 0) return "none";
  const first = dateKey(dated[0].date)!;
  const last = dateKey(dated[dated.length - 1].date)!;
  if (today < first) return "before";
  if (today > last) return "after";
  return "during";
}

function agendaItemTimeMs(item: AgendaItem): number | null {
  if (!item.start || !item.start.includes("T")) return null;
  const ms = Date.parse(item.start);
  return Number.isNaN(ms) ? null : ms;
}

export function nextAgendaItem(
  agenda: AgendaItem[],
  opts: { now: Date; isToday: boolean },
): { item: AgendaItem; status: "now" | "next" } | null {
  const remaining = agenda.filter(
    (item) => item.kind !== "place" || !item.visited,
  );
  if (remaining.length === 0) return null;

  if (!opts.isToday) {
    return { item: remaining[0], status: "next" };
  }

  const nowMs = opts.now.getTime();

  for (let i = 0; i < agenda.length; i++) {
    const item = agenda[i];
    if (item.kind === "place" && item.visited) continue;

    const time = agendaItemTimeMs(item);
    if (time != null && time < nowMs) {
      const laterStarted = agenda.slice(i + 1).some((later) => {
        const laterTime = agendaItemTimeMs(later);
        return laterTime != null && laterTime <= nowMs;
      });
      if (item.kind === "transit" || laterStarted) continue;
    }

    const status: "now" | "next" =
      time != null && time <= nowMs ? "now" : "next";
    return { item, status };
  }

  return null;
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
          detail: place.notes.trim(),
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
