import { describe, expect, it } from "vitest";
import {
  AUTUMN_LEAF_VARIANTS,
  autumnLeafVariant,
  buildOverviewDayCards,
  currentOverviewDayIndex,
} from "@/lib/overview-day-cards";

/** Realistic 7-day Japan trip ending 2026-11-12. */
const TRIP = [
  { id: "d1", date: "2026-11-06" },
  { id: "d2", date: "2026-11-07" },
  { id: "d3", date: "2026-11-08" },
  { id: "d4", date: "2026-11-09" },
  { id: "d5", date: "2026-11-10" },
  { id: "d6", date: "2026-11-11" },
  { id: "d7", date: "2026-11-12" },
];

function states(today: string) {
  return buildOverviewDayCards(TRIP, today).map((card) => card.state);
}

describe("buildOverviewDayCards", () => {
  it("returns nothing when there are no dated days", () => {
    expect(buildOverviewDayCards([], "2026-11-12")).toEqual([]);
    expect(
      buildOverviewDayCards(
        [
          { id: "x", date: null },
          { id: "", date: "2026-11-12" },
          { id: "y", date: "   " },
        ],
        "2026-11-12",
      ),
    ).toEqual([]);
  });

  it("keeps given order, skips undated rows, and numbers from 1", () => {
    const cards = buildOverviewDayCards(
      [
        { id: "skip", date: null },
        { id: "a", date: "2026-11-06T18:00:00+09:00" },
        { id: "b", date: "2026-11-07" },
      ],
      "2026-11-07",
    );
    expect(cards.map((card) => card.id)).toEqual(["a", "b"]);
    expect(cards.map((card) => card.dayNumber)).toEqual([1, 2]);
    expect(cards[0]?.date).toBe("2026-11-06");
    expect(cards[1]?.state).toBe("today");
  });

  it("treats today as the last day (2026-11-12)", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-12");
    expect(cards).toHaveLength(7);
    expect(states("2026-11-12")).toEqual([
      "past",
      "past",
      "past",
      "past",
      "past",
      "past",
      "today",
    ]);
    expect(currentOverviewDayIndex(cards)).toBe(6);
    expect(cards[6]).toMatchObject({
      id: "d7",
      dayNumber: 7,
      date: "2026-11-12",
    });
  });

  it("treats today as the first day", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-06");
    expect(states("2026-11-06")).toEqual([
      "today",
      "future",
      "future",
      "future",
      "future",
      "future",
      "future",
    ]);
    expect(currentOverviewDayIndex(cards)).toBe(0);
  });

  it("treats a mid-trip day as today", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-09");
    expect(states("2026-11-09")).toEqual([
      "past",
      "past",
      "past",
      "today",
      "future",
      "future",
      "future",
    ]);
    expect(currentOverviewDayIndex(cards)).toBe(3);
  });

  it("highlights no day before the trip", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-05");
    expect(states("2026-11-05")).toEqual([
      "future",
      "future",
      "future",
      "future",
      "future",
      "future",
      "future",
    ]);
    expect(currentOverviewDayIndex(cards)).toBeNull();
  });

  it("marks every day past after the trip", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-13");
    expect(states("2026-11-13")).toEqual([
      "past",
      "past",
      "past",
      "past",
      "past",
      "past",
      "past",
    ]);
    expect(currentOverviewDayIndex(cards)).toBeNull();
  });

  it("does not hardcode a 7-day length", () => {
    const cards = buildOverviewDayCards(
      [
        { id: "a", date: "2026-12-01" },
        { id: "b", date: "2026-12-02" },
        { id: "c", date: "2026-12-03" },
      ],
      "2026-12-02",
    );
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.state)).toEqual(["past", "today", "future"]);
    expect(currentOverviewDayIndex(cards)).toBe(1);
  });
});

describe("autumnLeafVariant", () => {
  it("cycles maple, rust, amber, gold, and burnt", () => {
    expect(AUTUMN_LEAF_VARIANTS).toEqual([
      "maple",
      "rust",
      "amber",
      "gold",
      "burnt",
    ]);
    expect(AUTUMN_LEAF_VARIANTS.map((_, index) => autumnLeafVariant(index))).toEqual(
      [...AUTUMN_LEAF_VARIANTS],
    );
    expect(autumnLeafVariant(5)).toBe("maple");
    expect(autumnLeafVariant(6)).toBe("rust");
    expect(autumnLeafVariant(-1)).toBe("burnt");
  });
});
