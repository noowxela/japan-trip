import { isEffectivelySkipped } from "@/lib/schedule-drawer";
import { buildAgenda } from "@/lib/trip-core";
import type { AgendaItem, Place, Transit, TripDay } from "@/lib/types";

export type VisitOverlays = {
  visited?: Readonly<Record<string, boolean>>;
  skipped?: Readonly<Record<string, boolean>>;
};

function isVisitedFlag(
  item: { id: string; visited: boolean },
  overlay: Readonly<Record<string, boolean>> = {},
): boolean {
  return overlay[item.id] ?? item.visited;
}

/** Places/transit that belong on the day=all "visited only" list. */
export function isVisitedAllDaysItem(
  item: { id: string; visited: boolean; skipped?: boolean; pending?: boolean },
  overlays: VisitOverlays = {},
): boolean {
  if (item.pending) return false;
  if (isEffectivelySkipped(item, overlays.skipped)) return false;
  return isVisitedFlag(item, overlays.visited);
}

/** Visited, non-pending, non-skipped agenda for one day (places + transit). */
export function visitedAgendaForDay(
  dayId: string,
  places: Place[],
  transit: Transit[],
  overlays: VisitOverlays = {},
): AgendaItem[] {
  const dayPlaces = places.filter(
    (place) =>
      place.dayIds.includes(dayId) && isVisitedAllDaysItem(place, overlays),
  );
  const dayTransit = transit.filter(
    (item) =>
      item.dayIds.includes(dayId) && isVisitedAllDaysItem(item, overlays),
  );
  return buildAgenda(dayPlaces, dayTransit);
}

export type VisitedAllDaysGroup = {
  day: TripDay;
  items: AgendaItem[];
};

/** Day groups for the all-days panel; days with no visited stops are omitted. */
export function visitedAgendaByDay(
  days: TripDay[],
  places: Place[],
  transit: Transit[],
  overlays: VisitOverlays = {},
): VisitedAllDaysGroup[] {
  return days
    .map((day) => ({
      day,
      items: visitedAgendaForDay(day.id, places, transit, overlays),
    }))
    .filter((group) => group.items.length > 0);
}

export function countVisitedAllDays(groups: VisitedAllDaysGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}
