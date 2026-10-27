import { describe, expect, it } from "vitest";
import {
  isTripSnapshot,
  migrateTripSnapshot,
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
