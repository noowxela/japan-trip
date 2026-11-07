import { dateKey, formatTime } from "@/lib/format";
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

/** How long a started flight (no arrival stored) stays the current item. */
const FLIGHT_NOW_MS = 8 * 60 * 60 * 1000;

function agendaItemTimeMs(item: AgendaItem): number | null {
  if (!item.start || !item.start.includes("T")) return null;
  const ms = Date.parse(item.start);
  return Number.isNaN(ms) ? null : ms;
}

/** Still on the to-do list: not visited and not skipped. */
export function isAgendaOpen(item: Pick<AgendaItem, "visited" | "skipped">) {
  return !item.visited && !item.skipped;
}

export function nextAgendaItem(
  agenda: AgendaItem[],
  opts: { now: Date; isToday: boolean },
): { item: AgendaItem; status: "now" | "next" } | null {
  const remaining = agenda.filter(isAgendaOpen);
  if (remaining.length === 0) return null;

  if (!opts.isToday) {
    return { item: remaining[0], status: "next" };
  }

  const nowMs = opts.now.getTime();

  for (let i = 0; i < agenda.length; i++) {
    const item = agenda[i];
    if (!isAgendaOpen(item)) continue;

    const time = agendaItemTimeMs(item);
    if (time != null && time < nowMs) {
      const laterStarted = agenda.slice(i + 1).some((later) => {
        const laterTime = agendaItemTimeMs(later);
        return laterTime != null && laterTime <= nowMs;
      });
      // A flight stays "now" while plausibly in the air (no arrival time is
      // stored); other transit is skipped once its start has passed.
      const inFlight =
        item.kind === "transit" &&
        item.chip === "Flight" &&
        nowMs - time < FLIGHT_NOW_MS;
      if (laterStarted || (item.kind === "transit" && !inFlight)) continue;
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

/**
 * Timed starts sort by Asia/Tokyo wall-clock time (HH:mm), matching formatTime.
 * Date-only or missing Start is "untimed" (UI shows "—") and sorts AFTER timed
 * items. Do not localeCompare raw ISO strings: a late-add whose Start date is
 * "today" (or a Z vs +09:00 mix) would scramble clock order on a single day list.
 */
export function agendaStartSortKey(start: string | null | undefined): string {
  if (!start || !start.includes("T")) return "9999";
  return formatTime(start) ?? "9999";
}

export function compareAgendaItems(
  a: Pick<AgendaItem, "start" | "order" | "name">,
  b: Pick<AgendaItem, "start" | "order" | "name">,
) {
  const startA = agendaStartSortKey(a.start);
  const startB = agendaStartSortKey(b.start);
  if (startA !== startB) return startA.localeCompare(startB);
  const orderA = a.order ?? 9999;
  const orderB = b.order ?? 9999;
  if (orderA !== orderB) return orderA - orderB;
  return a.name.localeCompare(b.name);
}

function sortAgenda(a: AgendaItem, b: AgendaItem) {
  return compareAgendaItems(a, b);
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
          skipped: place.skipped,
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
      from: item.from,
      to: item.to,
      start: item.start,
      order: item.order,
      visited: item.visited,
      skipped: item.skipped,
    })),
  ];
  return items.sort(sortAgenda);
}
