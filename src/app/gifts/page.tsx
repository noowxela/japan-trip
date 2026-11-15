import { GiftsOfflineFallback, GiftsView } from "@/components/gifts-view";
import { QuickExpenseTripSync } from "@/components/quick-expense-provider";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { getEditorNames } from "@/lib/trip";
import { notionReady } from "@/lib/notion";
import { makeTripSnapshot } from "@/lib/trip-cache";
import {
  getDays,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
} from "@/lib/trip";
import type { SpendItem, TripDay, Place } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GiftsPage() {
  if (!notionReady()) {
    return <GiftsOfflineFallback />;
  }

  let spends: SpendItem[] = [];
  let days: TripDay[] = [];
  let places: Place[] = [];
  let people: string[] = [];
  let snapshot = null;
  let loadFailed = false;
  try {
    const [dayList, placeList, transit, stays, spend, prep, editorNames] =
      await Promise.all([
        getDays(),
        getPlaces(),
        getTransit(),
        getStays(),
        getSpend(),
        getPrep(),
        getEditorNames(),
      ]);
    days = dayList;
    places = placeList;
    spends = spend;
    people = editorNames;
    snapshot = makeTripSnapshot({
      days: dayList,
      places: placeList,
      transit,
      stays,
      spend,
      prep,
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return <GiftsOfflineFallback />;
  }

  return (
    <>
      {snapshot ? <TripCacheSync snapshot={snapshot} /> : null}
      <QuickExpenseTripSync days={days} people={people} places={places} />
      <GiftsView initialSpends={spends} />
    </>
  );
}
