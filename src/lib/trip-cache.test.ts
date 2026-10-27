import { afterEach, describe, expect, it } from "vitest";
import {
  invalidateTripCacheMemory,
  isTripSnapshot,
  makeTripSnapshot,
  migrateTripSnapshot,
  readCachedTripSnapshot,
  type TripSnapshotV1,
} from "@/lib/trip-cache";

const v1: TripSnapshotV1 = {
  v: 1,
  savedAt: "2026-10-27T01:00:00.000Z",
  days: [{ id: "d1", name: "Day 1", date: "2026-10-27", city: "Tokyo", status: null }],
  places: [],
  transit: [],
  stays: [],
};

describe("migrateTripSnapshot", () => {
  it("upgrades v1 to v2 with empty spend/prep", () => {
    const migrated = migrateTripSnapshot(v1);
    expect(migrated).toEqual({
      ...v1,
      v: 2,
      spend: [],
      prep: [],
    });
    expect(isTripSnapshot(migrated)).toBe(true);
  });

  it("passes through valid v2", () => {
    const v2 = { ...v1, v: 2 as const, spend: [], prep: [] };
    expect(migrateTripSnapshot(v2)).toEqual(v2);
  });

  it("ignores unknown shapes", () => {
    expect(migrateTripSnapshot(null)).toBeNull();
    expect(migrateTripSnapshot({ v: 3 })).toBeNull();
    expect(migrateTripSnapshot({ v: 1, savedAt: "x" })).toBeNull();
  });
});

describe("readCachedTripSnapshot", () => {
  afterEach(() => {
    invalidateTripCacheMemory();
  });

  it("returns the same reference for the same raw input", () => {
    const snapshot = makeTripSnapshot({
      days: v1.days,
      places: [],
      transit: [],
      stays: [],
      spend: [],
      prep: [],
      savedAt: "2026-10-28T00:00:00.000Z",
    });
    const raw = JSON.stringify(snapshot);
    const getRaw = () => raw;

    const first = readCachedTripSnapshot(getRaw);
    const second = readCachedTripSnapshot(getRaw);
    expect(first).toEqual(snapshot);
    expect(second).toBe(first);
  });

  it("returns a new reference after the raw value changes", () => {
    const firstSnap = makeTripSnapshot({
      days: v1.days,
      places: [],
      transit: [],
      stays: [{ id: "s1", name: "A", checkIn: null, checkOut: null, address: "", bookingUrl: null, confirmation: "" }],
      spend: [],
      prep: [],
      savedAt: "2026-10-28T00:00:00.000Z",
    });
    const secondSnap = makeTripSnapshot({
      ...firstSnap,
      stays: [
        ...firstSnap.stays,
        {
          id: "s2",
          name: "B",
          checkIn: null,
          checkOut: null,
          address: "",
          bookingUrl: null,
          confirmation: "",
        },
      ],
      savedAt: "2026-10-28T01:00:00.000Z",
    });
    let current: string | null = JSON.stringify(firstSnap);
    const getRaw = () => current;

    const first = readCachedTripSnapshot(getRaw);
    current = JSON.stringify(secondSnap);
    const second = readCachedTripSnapshot(getRaw);
    expect(second).not.toBe(first);
    expect(second?.stays).toHaveLength(2);

    current = null;
    const third = readCachedTripSnapshot(getRaw);
    expect(third).toBeNull();
    expect(third).not.toBe(second);
  });
});
