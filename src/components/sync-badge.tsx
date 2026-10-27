"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useCacheFallback } from "@/components/cache-fallback";
import { useOutbox } from "@/components/outbox-provider";
import { useT } from "@/components/i18n-provider";
import { formatTime } from "@/lib/format";
import { readTripCache, TRIP_CACHE_STORAGE_KEY } from "@/lib/trip-cache";
import {
  type AddSpendPayload,
  type OutboxEntry,
  type TogglePrepPayload,
  type ToggleVisitedPayload,
} from "@/lib/outbox-core";

function placeNameFromCache(id: string): string | null {
  const place = readTripCache()?.places.find((item) => item.id === id);
  return place?.name?.trim() || null;
}

function labelForEntry(
  entry: OutboxEntry,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (entry.kind === "toggleVisited") {
    const payload = entry.payload as ToggleVisitedPayload;
    const name = placeNameFromCache(payload.id);
    if (name) {
      return t(
        payload.visited
          ? "offline.kindVisitedMark"
          : "offline.kindVisitedUnmark",
        { name },
      );
    }
    return t("offline.kindVisited", {
      state: payload.visited
        ? t("places.filterVisited")
        : t("places.notVisited"),
    });
  }
  if (entry.kind === "togglePrep") {
    const payload = entry.payload as TogglePrepPayload;
    return t("offline.kindPrep", {
      state: payload.done ? t("prep.markComplete") : t("prep.markIncomplete"),
    });
  }
  const payload = entry.payload as AddSpendPayload;
  return t("offline.kindSpend", { name: payload.name });
}

function subscribeSavedAt(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TRIP_CACHE_STORAGE_KEY) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  const id = window.setInterval(onStoreChange, 15_000);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.clearInterval(id);
  };
}

function getSavedAt(): string | null {
  return readTripCache()?.savedAt ?? null;
}

function subscribeMounted() {
  return () => {};
}

export function SyncBadge() {
  const { t } = useT();
  const pathname = usePathname();
  const { online, pendingCount, entries, retryEntry, replaying } = useOutbox();
  const { fromCache } = useCacheFallback();
  const hydrated = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const savedAt = useSyncExternalStore(subscribeSavedAt, getSavedAt, () => null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onSchedule = pathname === "/schedule" || pathname.startsWith("/schedule?");
  const onMap = pathname === "/map";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  // Client-only: online / pending / savedAt differ from the SSR snapshot and
  // from stale SW-cached HTML; avoid hydration text mismatches.
  if (!hydrated) return null;

  const showBanner = !online || fromCache;
  const showPendingChip = pendingCount > 0;
  if (!showBanner && !showPendingChip) return null;

  const time = formatTime(savedAt) ?? "--:--";
  const bannerText = !online
    ? t("offline.offlineBanner")
    : t("offline.cacheBanner");
  const chipLabel = !online
    ? pendingCount > 0
      ? t("offline.badgeOfflinePending", { time, n: pendingCount })
      : t("offline.badgeOffline", { time })
    : t("offline.badgePending", { n: pendingCount });

  const chipPosition = onSchedule
    ? "fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40 lg:right-8"
    : onMap
      ? "fixed right-3 bottom-[calc(var(--tab-bar-height,4.25rem)+16rem)] z-40"
      : "fixed right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-40";

  return (
    <>
      {showBanner ? (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-40 border-b border-line bg-maybe-soft px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] text-center text-[13px] font-medium text-ink"
        >
          {bannerText}
        </div>
      ) : null}
      {showPendingChip || (!online && pendingCount > 0) ? (
        <div ref={rootRef} className={chipPosition}>
          <button
            type="button"
            onClick={() => {
              if (pendingCount > 0) setOpen((value) => !value);
            }}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface/95 px-3 text-[11px] font-medium text-ink shadow-sm backdrop-blur"
            aria-expanded={open}
          >
            {chipLabel}
            {replaying ? "…" : ""}
          </button>
          {open && pendingCount > 0 ? (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg">
              <p className="px-2 pb-1 text-[11px] font-medium text-ink-muted">
                {t("offline.pendingList")}
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex min-h-11 items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-ink hover:bg-canvas"
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {labelForEntry(entry, t)}
                      {entry.lastError ? (
                        <span className="mt-0.5 block text-[10px] text-accent">
                          {entry.lastError}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => void retryEntry(entry.id)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-canvas px-2 text-[10px] font-medium text-ink"
                    >
                      {t("offline.retry")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
