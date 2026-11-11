import { describe, expect, it } from "vitest";
import {
  isEffectivelySkipped,
  scheduleDrawerOpener,
  skippedAgendaItems,
} from "@/lib/schedule-drawer";

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
});
