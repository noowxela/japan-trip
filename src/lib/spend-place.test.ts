import { describe, expect, it } from "vitest";
import {
  foodPlacesForDay,
  isDiningPlaceType,
  linkedPlaceLabel,
  linkedPlaceOf,
} from "@/lib/spend-place";
import type { Place } from "@/lib/types";

function place(partial: Partial<Place> & Pick<Place, "id" | "name">): Place {
  return {
    type: partial.type ?? "Food",
    mapsUrl: null,
    notes: "",
    visited: false,
    dayIds: partial.dayIds ?? ["d1"],
    start: null,
    lat: null,
    lng: null,
    pending: false,
    skipped: partial.skipped ?? false,
    ...partial,
  };
}

const ramen = place({ id: "p-ramen", name: "Ichiran", type: "Food", dayIds: ["d1"] });
const cafe = place({ id: "p-cafe", name: "Blue Bottle", type: "Cafe", dayIds: ["d1"] });
const shrine = place({ id: "p-shrine", name: "Meiji", type: "Sight", dayIds: ["d1"] });
const dinner = place({ id: "p-dinner", name: "Kikunoi", type: "Food", dayIds: ["d2"] });
const skipped = place({
  id: "p-skip",
  name: "Closed stall",
  type: "Food",
  dayIds: ["d1"],
  skipped: true,
});

describe("isDiningPlaceType", () => {
  it("accepts Food and Cafe only", () => {
    expect(isDiningPlaceType("Food")).toBe(true);
    expect(isDiningPlaceType("Cafe")).toBe(true);
    expect(isDiningPlaceType("Sight")).toBe(false);
    expect(isDiningPlaceType("Shop")).toBe(false);
    expect(isDiningPlaceType(null)).toBe(false);
  });
});

describe("foodPlacesForDay", () => {
  const places = [dinner, shrine, skipped, cafe, ramen];

  it("returns same-day Food and Cafe places, skipping other types and skipped rows", () => {
    expect(foodPlacesForDay(places, "d1").map((item) => item.id)).toEqual([
      "p-cafe",
      "p-ramen",
    ]);
  });

  it("returns an empty list when the day has no dining places or no day is selected", () => {
    expect(foodPlacesForDay(places, "d3")).toEqual([]);
    expect(foodPlacesForDay(places, "")).toEqual([]);
  });
});

describe("linkedPlaceOf", () => {
  const places = [ramen, cafe];

  it("resolves a stored place id and fails gracefully when it is missing", () => {
    expect(linkedPlaceOf({ placeId: "p-ramen" }, places)?.name).toBe("Ichiran");
    expect(linkedPlaceOf({ placeId: "gone" }, places)).toBeNull();
    expect(linkedPlaceOf({ placeId: null }, places)).toBeNull();
    expect(linkedPlaceLabel({ placeId: "gone" }, places)).toEqual({
      name: "",
      missing: true,
    });
    expect(linkedPlaceLabel({ placeId: "p-cafe" }, places)).toEqual({
      name: "Blue Bottle",
      missing: false,
    });
    expect(linkedPlaceLabel({ placeId: null }, places)).toBeNull();
  });
});
