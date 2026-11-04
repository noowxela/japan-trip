import { makeTripSnapshot, type TripSnapshot } from "@/lib/trip-cache";
import { getTripWeather } from "@/lib/weather";
import {
  getDays,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
} from "@/lib/trip";

export async function loadTripSnapshot(): Promise<TripSnapshot> {
  const [days, places, transit, stays, spend, prep] = await Promise.all([
    getDays(),
    getPlaces(),
    getTransit(),
    getStays(),
    getSpend(),
    getPrep(),
  ]);
  return makeTripSnapshot({ days, places, transit, stays, spend, prep });
}

/** Snapshot plus forecast; weather failures never fail the load. */
export async function loadTripSnapshotWithWeather(): Promise<TripSnapshot> {
  const [snapshot, weather] = await Promise.all([
    loadTripSnapshot(),
    getDays().then((days) => getTripWeather(days)),
  ]);
  return makeTripSnapshot({ ...snapshot, weather });
}
