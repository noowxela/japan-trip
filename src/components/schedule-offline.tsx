"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CacheFallbackSignal } from "@/components/cache-fallback";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { ScheduleView } from "@/components/schedule-view";
import { schedulePropsFromSnapshot } from "@/lib/schedule-pins";
import { readTripCache, TRIP_CACHE_STORAGE_KEY } from "@/lib/trip-cache";

type OfflineReady = {
  ready: true;
  props: ReturnType<typeof schedulePropsFromSnapshot>;
  savedAt: string | null;
};

type OfflineState = { ready: false } | OfflineReady;

const serverState: OfflineState = { ready: false };
const clientCache = new Map<string, OfflineReady>();

function subscribeTripCache(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TRIP_CACHE_STORAGE_KEY) {
      clientCache.clear();
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getOfflineSnapshot(
  dayParam: string | undefined,
  bareSchedule: boolean,
): OfflineReady {
  const key = `${dayParam ?? ""}|${bareSchedule ? "1" : "0"}`;
  const cached = clientCache.get(key);
  if (cached) return cached;

  const snapshot = readTripCache();
  const value: OfflineReady = {
    ready: true,
    props: snapshot
      ? schedulePropsFromSnapshot(snapshot, dayParam, {
          preferTodayDuringTrip: bareSchedule,
        })
      : null,
    savedAt: snapshot?.savedAt ?? null,
  };
  clientCache.set(key, value);
  return value;
}

export function ScheduleOfflineFallback({
  dayParam,
  modeParam,
  bareSchedule = false,
}: {
  dayParam?: string;
  modeParam?: string;
  bareSchedule?: boolean;
}) {
  const { t } = useT();
  const state = useSyncExternalStore(
    subscribeTripCache,
    () => getOfflineSnapshot(dayParam, bareSchedule),
    () => serverState,
  );

  if (!state.ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas px-4 text-sm text-ink-muted">
        {t("schedule.loadingSaved")}
      </div>
    );
  }

  if (!state.props) {
    return (
      <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
        <EmptyState title={t("schedule.offlineTitle")}>
          {t("schedule.offlineBody")}
        </EmptyState>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-medium text-ink-muted no-underline">
            {t("nav.backOverview")}
          </Link>
        </p>
      </div>
    );
  }

  const wantNow =
    modeParam === "now" || (bareSchedule && state.props.phase === "during");
  const initialMode =
    modeParam === "edit"
      ? ("edit" as const)
      : wantNow && state.props.nowModeAllowed
        ? ("now" as const)
        : ("view" as const);

  return (
    <>
      <CacheFallbackSignal />
      <ScheduleView
        days={state.props.days}
        places={state.props.places}
        byDay={state.props.byDay}
        allPins={state.props.allPins}
        initialDayId={state.props.initialDayId}
        initialMode={initialMode}
        cachedAt={state.savedAt}
        today={state.props.today}
        phase={state.props.phase}
      />
    </>
  );
}
