import { makeTripSnapshot, type TripSnapshot } from "@/lib/trip-cache";
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
