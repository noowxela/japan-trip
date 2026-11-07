import { describe, expect, it } from "vitest";
import {
  isMapFocusable,
  isNumberedMapStop,
  pinKind,
  sightNumbersById,
  sightNumbersFromAgenda,
} from "@/lib/schedule-pins";
import type { AgendaItem } from "@/lib/types";

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
