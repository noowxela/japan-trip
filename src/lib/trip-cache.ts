import type { Place, Stay, Transit, TripDay } from "@/lib/types";

export const TRIP_CACHE_STORAGE_KEY = "japan-trip-itinerary-v1";

export type TripSnapshot = {
  v: 1;
  savedAt: string;
  days: TripDay[];
  places: Place[];
  transit: Transit[];
  stays: Stay[];
};

export function isTripSnapshot(value: unknown): value is TripSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as TripSnapshot;
  return (
    snap.v === 1 &&
    typeof snap.savedAt === "string" &&
    Array.isArray(snap.days) &&
    Array.isArray(snap.places) &&
    Array.isArray(snap.transit) &&
    Array.isArray(snap.stays)
  );
}

export function readTripCache(): TripSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRIP_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isTripSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeTripCache(snapshot: TripSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIP_CACHE_STORAGE_KEY, JSON.stringify(snapshot));
}
