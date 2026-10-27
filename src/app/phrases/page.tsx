import {
  PhrasesOfflineFallback,
  PhrasesView,
} from "@/components/phrases-view";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { notionReady } from "@/lib/notion";
import { makeTripSnapshot, type TripSnapshot } from "@/lib/trip-cache";
import {
  getDays,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
} from "@/lib/trip";
import type { Stay } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PhrasesPage() {
  if (!notionReady()) {
    return <PhrasesOfflineFallback />;
  }

  let stays: Stay[] = [];
  let snapshot: TripSnapshot | null = null;
  let loadFailed = false;
  try {
    const [days, places, transit, stayList, spend, prep] = await Promise.all([
      getDays(),
      getPlaces(),
      getTransit(),
      getStays(),
      getSpend(),
      getPrep(),
    ]);
    stays = stayList;
    snapshot = makeTripSnapshot({
      days,
      places,
      transit,
      stays: stayList,
      spend,
      prep,
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return <PhrasesOfflineFallback />;
  }

  return (
    <>
      {snapshot ? <TripCacheSync snapshot={snapshot} /> : null}
      <PhrasesView initialStays={stays} />
    </>
  );
}
