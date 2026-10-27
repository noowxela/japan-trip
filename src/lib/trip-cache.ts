import type { Place, PrepItem, SpendItem, Stay, Transit, TripDay } from "@/lib/types";

export const TRIP_CACHE_STORAGE_KEY = "japan-trip-itinerary-v1";
/** Same-tab signal for useSyncExternalStore subscribers. */
export const TRIP_CACHE_CHANGE_EVENT = "japan-trip-cache-change";

/** Stable empty stays for useSyncExternalStore snapshots (React #185). */
export const EMPTY_STAYS: Stay[] = [];
Object.freeze(EMPTY_STAYS);

export type TripSnapshotV1 = {
  v: 1;
  savedAt: string;
  days: TripDay[];
  places: Place[];
  transit: Transit[];
  stays: Stay[];
};

export type TripSnapshot = {
  v: 2;
  savedAt: string;
  days: TripDay[];
  places: Place[];
  transit: Transit[];
  stays: Stay[];
  spend: SpendItem[];
  prep: PrepItem[];
};

/** Module memo so getSnapshot returns a stable reference (React #185). */
let memoryRaw: string | null | undefined = undefined;
let memorySnapshot: TripSnapshot | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isTripSnapshotV1(value: unknown): value is TripSnapshotV1 {
  if (!isObject(value)) return false;
  return (
    value.v === 1 &&
    typeof value.savedAt === "string" &&
    Array.isArray(value.days) &&
    Array.isArray(value.places) &&
    Array.isArray(value.transit) &&
    Array.isArray(value.stays)
  );
}

export function isTripSnapshot(value: unknown): value is TripSnapshot {
  if (!isObject(value)) return false;
  return (
    value.v === 2 &&
    typeof value.savedAt === "string" &&
    Array.isArray(value.days) &&
    Array.isArray(value.places) &&
    Array.isArray(value.transit) &&
    Array.isArray(value.stays) &&
    Array.isArray(value.spend) &&
    Array.isArray(value.prep)
  );
}

/** Upgrade a v1 snapshot (or ignore unknown shapes). */
export function migrateTripSnapshot(value: unknown): TripSnapshot | null {
  if (isTripSnapshot(value)) return value;
  if (!isTripSnapshotV1(value)) return null;
  return {
    v: 2,
    savedAt: value.savedAt,
    days: value.days,
    places: value.places,
    transit: value.transit,
    stays: value.stays,
    spend: [],
    prep: [],
  };
}

/** Invalidate memo (tests / cross-tab storage). */
export function invalidateTripCacheMemory() {
  memoryRaw = undefined;
  memorySnapshot = null;
}

/**
 * Cached trip-snapshot reader. Re-parses only when the raw string changes.
 * Inject `getRaw` for pure tests (no jsdom / localStorage). Does not write
 * migrations — callers that need v1→v2 persist should use `readTripCache`.
 */
export function readCachedTripSnapshot(
  getRaw: () => string | null,
): TripSnapshot | null {
  const raw = getRaw();
  if (raw === memoryRaw) return memorySnapshot;
  if (!raw) {
    memoryRaw = raw;
    memorySnapshot = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateTripSnapshot(parsed);
    memoryRaw = raw;
    memorySnapshot = migrated;
    return memorySnapshot;
  } catch {
    memoryRaw = raw;
    memorySnapshot = null;
    return null;
  }
}

/** Stays from the memoized trip snapshot (never a fresh `[]`). */
export function readTripCacheStays(): Stay[] {
  return readTripCache()?.stays ?? EMPTY_STAYS;
}

export function readTripCache(): TripSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TRIP_CACHE_STORAGE_KEY);
    if (raw === memoryRaw) return memorySnapshot;
    if (!raw) {
      memoryRaw = null;
      memorySnapshot = null;
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    const migrated = migrateTripSnapshot(parsed);
    if (migrated && !isTripSnapshot(parsed)) {
      writeTripCache(migrated);
      return memorySnapshot;
    }
    memoryRaw = raw;
    memorySnapshot = migrated;
    return memorySnapshot;
  } catch {
    memoryRaw = null;
    memorySnapshot = null;
    return null;
  }
}

export function writeTripCache(snapshot: TripSnapshot) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(snapshot);
  localStorage.setItem(TRIP_CACHE_STORAGE_KEY, raw);
  memoryRaw = raw;
  memorySnapshot = snapshot;
  window.dispatchEvent(new Event(TRIP_CACHE_CHANGE_EVENT));
}

export function subscribeTripCache(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === TRIP_CACHE_STORAGE_KEY) {
      invalidateTripCacheMemory();
      onStoreChange();
    }
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(TRIP_CACHE_CHANGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TRIP_CACHE_CHANGE_EVENT, onLocal);
  };
}

export function makeTripSnapshot(input: {
  days: TripDay[];
  places: Place[];
  transit: Transit[];
  stays: Stay[];
  spend?: SpendItem[];
  prep?: PrepItem[];
  savedAt?: string;
}): TripSnapshot {
  return {
    v: 2,
    savedAt: input.savedAt ?? new Date().toISOString(),
    days: input.days,
    places: input.places,
    transit: input.transit,
    stays: input.stays,
    spend: input.spend ?? [],
    prep: input.prep ?? [],
  };
}
