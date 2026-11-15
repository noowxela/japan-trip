import type { Place, SpendItem } from "@/lib/types";

/** Schedule place types that count as dining for a food expense link. */
export const DINING_PLACE_TYPES = ["Food", "Cafe"] as const;

export function isDiningPlaceType(type: string | null | undefined): boolean {
  return type === "Food" || type === "Cafe";
}

/** Food/Cafe itinerary places linked to a day, in name order. */
export function foodPlacesForDay(places: Place[], dayId: string): Place[] {
  if (!dayId) return [];
  return places
    .filter(
      (place) =>
        !place.skipped &&
        place.dayIds.includes(dayId) &&
        isDiningPlaceType(place.type),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolve a stored spend→place link; null if the place was deleted or missing. */
export function linkedPlaceOf(
  item: Pick<SpendItem, "placeId">,
  places: Place[],
): Place | null {
  const placeId = item.placeId?.trim() ?? "";
  if (!placeId) return null;
  return places.find((place) => place.id === placeId) ?? null;
}

export function linkedPlaceLabel(
  item: Pick<SpendItem, "placeId">,
  places: Place[],
): { name: string; missing: boolean } | null {
  const placeId = item.placeId?.trim() ?? "";
  if (!placeId) return null;
  const place = places.find((entry) => entry.id === placeId);
  if (!place) return { name: "", missing: true };
  return { name: place.name, missing: false };
}
