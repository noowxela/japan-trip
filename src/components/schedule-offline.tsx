"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ScheduleView } from "@/components/schedule-view";
import { schedulePropsFromSnapshot } from "@/lib/schedule-pins";
import { readTripCache } from "@/lib/trip-cache";

export function ScheduleOfflineFallback({ dayParam }: { dayParam?: string }) {
  const [ready, setReady] = useState(false);
  const [props, setProps] = useState<ReturnType<
    typeof schedulePropsFromSnapshot
  > | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const snapshot = readTripCache();
    setSavedAt(snapshot?.savedAt ?? null);
    setProps(snapshot ? schedulePropsFromSnapshot(snapshot, dayParam) : null);
    setReady(true);
  }, [dayParam]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-paper px-4 text-sm text-stone-500">
        Loading saved itinerary…
      </div>
    );
  }

  if (!props) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
        <EmptyState title="Can't reach Notion">
          No saved itinerary on this phone. Open Schedule once while online, then
          it will work underground.
        </EmptyState>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-medium text-hanko">
            Back to Overview
          </Link>
        </p>
      </div>
    );
  }

  return (
    <ScheduleView
      days={props.days}
      places={props.places}
      byDay={props.byDay}
      allPins={props.allPins}
      initialDayId={props.initialDayId}
      cachedAt={savedAt}
    />
  );
}
