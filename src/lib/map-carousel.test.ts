import { describe, expect, it } from "vitest";
import {
  ALL_CITIES_KEY,
  carouselPinsForCity,
  citiesInTripOrder,
  cityChipLabel,
  filterPinsByCity,
  normalizeCityKey,
  sortPinsByDayThenTime,
  type MapCarouselPin,
} from "@/lib/map-carousel";

function pin(partial: Partial<MapCarouselPin> & Pick<MapCarouselPin, "id">): MapCarouselPin {
  return {
    name: partial.name ?? partial.id,
    lat: partial.lat ?? 35,
    lng: partial.lng ?? 139,
    dayId: partial.dayId ?? null,
    dayIndex: partial.dayIndex ?? 0,
    start: partial.start ?? null,
    type: partial.type ?? "Sight",
    city: partial.city ?? null,
    mapsUrl: partial.mapsUrl ?? null,
    visited: partial.visited ?? false,
    ...partial,
  };
}

describe("normalizeCityKey", () => {
  it("unifies Tokyo spellings", () => {
    expect(normalizeCityKey("Tokyo")).toBe("東京");
    expect(normalizeCityKey("东京")).toBe("東京");
    expect(normalizeCityKey("東京")).toBe("東京");
  });

  it("returns null for empty", () => {
    expect(normalizeCityKey(null)).toBeNull();
    expect(normalizeCityKey("  ")).toBeNull();
  });
});

describe("citiesInTripOrder", () => {
  it("dedupes in first-seen day order", () => {
    expect(
      citiesInTripOrder([
        { city: "Tokyo" },
        { city: "Tokyo" },
        { city: "Kyoto" },
        { city: "Osaka" },
        { city: "京都" },
        { city: null },
      ]),
    ).toEqual(["Tokyo", "Kyoto", "Osaka"]);
  });
});

describe("cityChipLabel", () => {
  it("uses kanji for zh and romaji for en", () => {
    expect(cityChipLabel("Tokyo", "zh")).toBe("東京");
    expect(cityChipLabel("东京", "en")).toBe("Tokyo");
    expect(cityChipLabel("Kyoto", "en")).toBe("Kyoto");
  });
});

describe("sort / filter carousel pins", () => {
  const pins = [
    pin({ id: "b", dayIndex: 1, start: "2026-10-28T14:00:00+09:00", city: "Kyoto" }),
    pin({ id: "a", dayIndex: 0, start: "2026-10-27T10:00:00+09:00", city: "Tokyo" }),
    pin({ id: "c", dayIndex: 0, start: "2026-10-27T09:00:00+09:00", city: "东京" }),
    pin({ id: "d", dayIndex: 2, start: null, city: "Osaka" }),
  ];

  it("sorts by day then start time", () => {
    expect(sortPinsByDayThenTime(pins).map((p) => p.id)).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("filters by city including alternate scripts", () => {
    expect(filterPinsByCity(pins, "Tokyo").map((p) => p.id).sort()).toEqual([
      "a",
      "c",
    ]);
    expect(filterPinsByCity(pins, ALL_CITIES_KEY)).toHaveLength(4);
    expect(filterPinsByCity(pins, null)).toHaveLength(4);
  });

  it("carouselPinsForCity filters then sorts", () => {
    expect(carouselPinsForCity(pins, "Tokyo").map((p) => p.id)).toEqual([
      "c",
      "a",
    ]);
  });
});
