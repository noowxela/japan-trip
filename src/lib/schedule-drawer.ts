import type { AgendaItem, Place } from "@/lib/types";

export type ScheduleDrawerTab = "pending" | "skipped";

export type ScheduleDrawerOpener =
  | {
      show: false;
      defaultTab: "pending";
      key: null;
      vars: null;
    }
  | {
      show: true;
      defaultTab: ScheduleDrawerTab;
      key:
        | "schedule.pendingCount"
        | "schedule.skippedCount"
        | "schedule.pendingAndSkippedCount";
      vars: { n: number; m?: number };
    };

/** Header control + default tab for the schedule pending/skipped drawer. */
export function scheduleDrawerOpener(
  pendingCount: number,
  skippedCount: number,
): ScheduleDrawerOpener {
  const defaultTab: ScheduleDrawerTab =
    pendingCount > 0 ? "pending" : "skipped";
  if (pendingCount > 0 && skippedCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.pendingAndSkippedCount",
      vars: { n: pendingCount, m: skippedCount },
    };
  }
  if (pendingCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.pendingCount",
      vars: { n: pendingCount },
    };
  }
  if (skippedCount > 0) {
    return {
      show: true,
      defaultTab,
      key: "schedule.skippedCount",
      vars: { n: skippedCount },
    };
  }
  return { show: false, defaultTab: "pending", key: null, vars: null };
}

export function isEffectivelySkipped(
  item: { id: string; skipped?: boolean },
  overlay: Readonly<Record<string, boolean>> = {},
): boolean {
  return overlay[item.id] ?? Boolean(item.skipped);
}

export function skippedAgendaItems<T extends { id: string; skipped?: boolean }>(
  agenda: T[],
  overlay: Readonly<Record<string, boolean>> = {},
): T[] {
  return agenda.filter((item) => isEffectivelySkipped(item, overlay));
}

/** Hide rows the skipped overlay has already moved off the pending list. */
export function excludeSkippedByOverlay<T extends { id: string; skipped?: boolean }>(
  items: T[],
  overlay: Readonly<Record<string, boolean>> = {},
): T[] {
  return items.filter((item) => !isEffectivelySkipped(item, overlay));
}

/** Agenda shape for a pending place that was just skipped (optimistic list). */
export function pendingPlaceToAgendaItem(place: Place): AgendaItem {
  return {
    id: place.id,
    kind: "place",
    name: place.name,
    chip: place.type,
    detail: place.notes.trim(),
    start: place.start,
    order: null,
    visited: place.visited,
    skipped: true,
    mapsUrl: place.mapsUrl,
    lat: place.lat,
    lng: place.lng,
  };
}

/**
 * Skipped tab: agenda rows that are skipped, plus pending places the overlay
 * has already marked skipped (they are not in `agenda` until refresh).
 */
export function skippedListItems(
  agenda: AgendaItem[],
  pendingPlaces: Place[],
  overlay: Readonly<Record<string, boolean>> = {},
): AgendaItem[] {
  const fromAgenda = skippedAgendaItems(agenda, overlay);
  const seen = new Set(fromAgenda.map((item) => item.id));
  const fromPending = pendingPlaces
    .filter((place) => isEffectivelySkipped(place, overlay) && !seen.has(place.id))
    .map(pendingPlaceToAgendaItem);
  return [...fromAgenda, ...fromPending];
}
