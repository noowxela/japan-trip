import { describe, expect, it } from "vitest";
import {
  excludeSkippedByOverlay,
  isEffectivelySkipped,
  pendingPlaceToAgendaItem,
  scheduleDrawerOpener,
  skippedAgendaItems,
  skippedListItems,
} from "@/lib/schedule-drawer";
import type { Place } from "@/lib/types";

describe("scheduleDrawerOpener", () => {
  it("hides the control when both counts are zero", () => {
    expect(scheduleDrawerOpener(0, 0)).toEqual({
      show: false,
      defaultTab: "pending",
      key: null,
      vars: null,
    });
  });

  it("uses the pending label and tab when only pending exist", () => {
    expect(scheduleDrawerOpener(3, 0)).toEqual({
      show: true,
      defaultTab: "pending",
      key: "schedule.pendingCount",
      vars: { n: 3 },
    });
  });

  it("uses the skipped label and tab when only skipped exist", () => {
    expect(scheduleDrawerOpener(0, 2)).toEqual({
      show: true,
      defaultTab: "skipped",
      key: "schedule.skippedCount",
      vars: { n: 2 },
    });
  });

  it("combines both counts and still defaults to pending", () => {
    expect(scheduleDrawerOpener(3, 2)).toEqual({
      show: true,
      defaultTab: "pending",
      key: "schedule.pendingAndSkippedCount",
      vars: { n: 3, m: 2 },
    });
  });
});

describe("isEffectivelySkipped / skippedAgendaItems", () => {
  const items = [
    { id: "a", skipped: false },
    { id: "b", skipped: true },
    { id: "c" },
  ];

  it("treats the overlay as the live skipped flag", () => {
    expect(isEffectivelySkipped(items[0], { a: true })).toBe(true);
    expect(isEffectivelySkipped(items[1], { b: false })).toBe(false);
    expect(isEffectivelySkipped(items[1])).toBe(true);
  });

  it("lists skipped rows including optimistic overlay", () => {
    expect(skippedAgendaItems(items).map((item) => item.id)).toEqual(["b"]);
    expect(
      skippedAgendaItems(items, { a: true, b: false }).map((item) => item.id),
    ).toEqual(["a"]);
  });

  it("hides pending rows once the overlay marks them skipped", () => {
    expect(excludeSkippedByOverlay(items, { a: true }).map((item) => item.id)).toEqual(
      ["c"],
    );
    expect(excludeSkippedByOverlay(items).map((item) => item.id)).toEqual([
      "a",
      "c",
    ]);
  });
});

const pending = (partial: Partial<Place> & Pick<Place, "id" | "name">): Place => ({
  type: "Sight",
  mapsUrl: null,
  notes: "",
  visited: false,
  dayIds: ["d1"],
  start: null,
  lat: null,
  lng: null,
  pending: true,
  skipped: false,
  ...partial,
});

describe("skippedListItems", () => {
  it("adds overlay-skipped pending places that are not yet on the agenda", () => {
    const maybe = pending({ id: "p-maybe", name: "Maybe cafe", type: "Cafe" });
    const agenda = [
      {
        id: "a",
        kind: "place" as const,
        name: "Temple",
        chip: "Sight",
        detail: "",
        start: null,
        order: null,
        skipped: true,
      },
    ];
    expect(skippedListItems(agenda, [maybe]).map((item) => item.id)).toEqual(["a"]);
    const combined = skippedListItems(agenda, [maybe], { "p-maybe": true });
    expect(combined.map((item) => item.id)).toEqual(["a", "p-maybe"]);
    expect(combined[1]).toMatchObject({
      kind: "place",
      name: "Maybe cafe",
      chip: "Cafe",
      skipped: true,
    });
    expect(pendingPlaceToAgendaItem(maybe).id).toBe("p-maybe");
  });
});
