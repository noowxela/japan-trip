import { afterEach, describe, expect, it, vi } from "vitest";
import {
  invalidateTripCacheMemory,
  makeTripSnapshot,
  readTripCache,
  TRIP_CACHE_STORAGE_KEY,
  writeTripCache,
} from "@/lib/trip-cache";

describe("readTripCache snapshot stability", () => {
  afterEach(() => {
    invalidateTripCacheMemory();
    vi.unstubAllGlobals();
  });

  it("returns the same object reference when raw storage is unchanged", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      dispatchEvent: () => true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    });

    const snapshot = makeTripSnapshot({
      days: [],
      places: [],
      transit: [],
      stays: [],
      spend: [],
      prep: [],
      savedAt: "2026-10-27T01:00:00.000Z",
    });
    writeTripCache(snapshot);

    const first = readTripCache();
    const second = readTripCache();
    expect(first).toBe(snapshot);
    expect(second).toBe(first);
    expect(store.get(TRIP_CACHE_STORAGE_KEY)).toBeTruthy();
  });
});
