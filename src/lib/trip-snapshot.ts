import { getDays, getPlaces, getStays, getTransit } from "@/lib/trip";
import type { TripSnapshot } from "@/lib/trip-cache";

export async function loadTripSnapshot(): Promise<TripSnapshot> {
  const [days, places, transit, stays] = await Promise.all([
    getDays(),
    getPlaces(),
    getTransit(),
    getStays(),
  ]);
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    days,
    places,
    transit,
    stays,
  };
}
