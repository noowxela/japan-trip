import { describe, expect, it } from "vitest";
import { isMapFocusable } from "@/lib/schedule-pins";
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
