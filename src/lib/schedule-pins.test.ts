import { describe, expect, it } from "vitest";
import {
  isMapFocusable,
  isNumberedMapStop,
  mapPinsForDay,
  pinKind,
  pinsForAllDays,
  pinsFromAgenda,
  sightNumbersById,
  sightNumbersFromAgenda,
} from "@/lib/schedule-pins";
import type { AgendaItem, Place, TripDay } from "@/lib/types";

function item(over: Partial<AgendaItem> = {}): AgendaItem {
  return {
    id: "p1",
    kind: "place",
    name: "Fushimi Inari",
    chip: "Sight",
    detail: "",
    start: null,
    order: null,
    lat: 34.967,
    lng: 135.772,
    ...over,
  };
}

describe("isMapFocusable", () => {
  it("allows a located, visible place", () => {
    expect(isMapFocusable(item(), new Set())).toBe(true);
  });

  it("rejects transit rows", () => {
    expect(isMapFocusable(item({ kind: "transit" }), new Set())).toBe(false);
  });

  it("rejects places without coordinates", () => {
    expect(isMapFocusable(item({ lat: null }), new Set())).toBe(false);
    expect(isMapFocusable(item({ lng: undefined }), new Set())).toBe(false);
  });

  it("rejects pins hidden from the map", () => {
    expect(isMapFocusable(item(), new Set(["p1"]))).toBe(false);
  });

  it("rejects skipped places, including an optimistic overlay", () => {
    expect(isMapFocusable(item({ skipped: true }), new Set())).toBe(false);
    expect(isMapFocusable(item(), new Set(), { p1: true })).toBe(false);
    expect(
      isMapFocusable(item({ skipped: true }), new Set(), { p1: false }),
    ).toBe(true);
  });

  it("accepts zero coordinates", () => {
    expect(isMapFocusable(item({ lat: 0, lng: 0 }), new Set())).toBe(true);
  });
});

describe("pinKind / isNumberedMapStop", () => {
  it("maps Shop and Other to other, Sight to sight, Food/Cafe to food", () => {
    expect(pinKind("Shop")).toBe("other");
    expect(pinKind("Other")).toBe("other");
    expect(pinKind("Sight")).toBe("sight");
    expect(pinKind("Food")).toBe("food");
    expect(pinKind("Cafe")).toBe("food");
  });

  it("numbers Sight and Shop/Other, not food or stay", () => {
    expect(isNumberedMapStop("sight")).toBe(true);
    expect(isNumberedMapStop("other")).toBe(true);
    expect(isNumberedMapStop("food")).toBe(false);
    expect(isNumberedMapStop("stay")).toBe(false);
  });
});

describe("sightNumbersById", () => {
  it("assigns sequential numbers to Sight and Shop in list order", () => {
    const numbers = sightNumbersById([
      { id: "s1", kind: "sight" },
      { id: "f1", kind: "food" },
      { id: "shop1", kind: "other" },
      { id: "s2", kind: "sight" },
      { id: "stay1", kind: "stay", label: "Stay" },
    ]);
    expect([...numbers.entries()]).toEqual([
      ["s1", 1],
      ["shop1", 2],
      ["s2", 3],
    ]);
  });

  it("skips labeled pins (trip-wide day badges)", () => {
    const numbers = sightNumbersById([
      { id: "a", kind: "sight", label: "D1" },
      { id: "b", kind: "other" },
    ]);
    expect([...numbers.entries()]).toEqual([["b", 1]]);
  });
});

describe("sightNumbersFromAgenda", () => {
  it("numbers Shop alongside Sight from agenda order", () => {
    const numbers = sightNumbersFromAgenda([
      item({ id: "temple", chip: "Sight", lat: 1, lng: 1 }),
      item({ id: "lunch", chip: "Food", lat: 2, lng: 2 }),
      item({ id: "uniqlo", chip: "Shop", lat: 3, lng: 3 }),
      item({ id: "gu", chip: "Shop", lat: 4, lng: 4 }),
      item({ id: "no-coords", chip: "Shop", lat: null, lng: null }),
      item({ id: "skipped", chip: "Sight", lat: 5, lng: 5, skipped: true }),
    ]);
    expect([...numbers.entries()]).toEqual([
      ["temple", 1],
      ["uniqlo", 2],
      ["gu", 3],
    ]);
  });
});

describe("pinsFromAgenda mapsUrl", () => {
  it("carries mapsUrl from agenda places onto map pins", () => {
    const pins = pinsFromAgenda(
      [
        item({
          id: "p1",
          mapsUrl: "https://maps.app.goo.gl/abc123",
          lat: 34.967,
          lng: 135.772,
        }),
      ],
      [],
    );
    expect(pins).toEqual([
      {
        id: "p1",
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        kind: "sight",
        mapsUrl: "https://maps.app.goo.gl/abc123",
      },
    ]);
  });
});

describe("pinsFromAgenda / mapPinsForDay skip skipped places", () => {
  const pending: Place[] = [
    {
      id: "pending-1",
      name: "Maybe cafe",
      type: "Cafe",
      mapsUrl: null,
      notes: "",
      visited: false,
      dayIds: ["d1"],
      start: null,
      lat: 35.0,
      lng: 135.0,
      pending: true,
      skipped: false,
    },
  ];

  it("omits skipped agenda places but keeps pending and active stops", () => {
    const pins = pinsFromAgenda(
      [
        item({ id: "active", chip: "Sight", lat: 34.9, lng: 135.7 }),
        item({
          id: "skipped",
          chip: "Sight",
          lat: 34.8,
          lng: 135.6,
          skipped: true,
        }),
        item({ id: "food", chip: "Food", lat: 34.7, lng: 135.5 }),
      ],
      pending,
    );
    expect(pins.map((pin) => pin.id)).toEqual(["active", "food", "pending-1"]);
  });

  it("honors skippedOverlay so a just-skipped pin disappears immediately", () => {
    const pins = pinsFromAgenda(
      [item({ id: "p1", lat: 34.967, lng: 135.772 })],
      pending,
      { p1: true },
    );
    expect(pins.map((pin) => pin.id)).toEqual(["pending-1"]);
  });

  it("brings an unskipped overlay item back and mapPinsForDay still keeps stays", () => {
    const pins = mapPinsForDay(
      [item({ id: "p1", skipped: true, lat: 34.967, lng: 135.772 })],
      [],
      [
        {
          id: "stay-1",
          name: "Hotel",
          checkIn: "2026-11-11",
          checkOut: "2026-11-12",
          address: "",
          bookingUrl: null,
          confirmation: "",
          mapsUrl: null,
          lat: 35.1,
          lng: 135.2,
        },
      ],
      "2026-11-11",
      { p1: false },
    );
    expect(pins.map((pin) => pin.id)).toEqual(["p1", "stay-1"]);
  });
});

describe("pinsForAllDays", () => {
  const days: TripDay[] = [
    {
      id: "d1",
      name: "Day 1",
      date: "2026-11-11",
      city: "Kyoto",
      status: null,
    },
  ];

  function place(over: Partial<Place> = {}): Place {
    return {
      id: "p1",
      name: "Fushimi Inari",
      type: "Sight",
      mapsUrl: null,
      notes: "",
      visited: false,
      dayIds: ["d1"],
      start: null,
      lat: 34.967,
      lng: 135.772,
      pending: false,
      skipped: false,
      ...over,
    };
  }

  it("omits skipped places and keeps pending ones", () => {
    const pins = pinsForAllDays(days, [
      place({ id: "active" }),
      place({ id: "skipped", skipped: true }),
      place({ id: "pending", pending: true, lat: 35, lng: 135 }),
    ]);
    expect(pins.map((pin) => pin.id)).toEqual(["active", "pending"]);
  });

  it("applies skippedOverlay", () => {
    const pins = pinsForAllDays(days, [place()], { p1: true });
    expect(pins).toEqual([]);
  });
});
