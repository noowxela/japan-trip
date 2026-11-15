import { describe, expect, it } from "vitest";
import {
  buildOverviewDayCards,
  currentOverviewDayIndex,
  formatOverviewDayCardDate,
  formatOverviewDayCardLabel,
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

describe("overview day card labels", () => {
  it("prefixes the day number with D", () => {
    expect(formatOverviewDayCardLabel(1)).toBe("D1");
    expect(formatOverviewDayCardLabel(7)).toBe("D7");
  });

  it("formats dates as lowercase month abbreviation plus day", () => {
    expect(formatOverviewDayCardDate("2026-11-06")).toBe("nov6");
    expect(formatOverviewDayCardDate("2026-11-10")).toBe("nov10");
    expect(formatOverviewDayCardDate("2026-11-12T18:00:00+09:00")).toBe("nov12");
    expect(formatOverviewDayCardDate("2026-01-01")).toBe("jan1");
    expect(formatOverviewDayCardDate(null)).toBe("");
    expect(formatOverviewDayCardDate("   ")).toBe("");
  });

  it("labels every trip card as D1/nov6 through D7/nov12", () => {
    const cards = buildOverviewDayCards(TRIP, "2026-11-12");
    expect(
      cards.map((card) => [
        formatOverviewDayCardLabel(card.dayNumber),
        formatOverviewDayCardDate(card.date),
      ]),
    ).toEqual([
      ["D1", "nov6"],
      ["D2", "nov7"],
      ["D3", "nov8"],
      ["D4", "nov9"],
      ["D5", "nov10"],
      ["D6", "nov11"],
      ["D7", "nov12"],
    ]);
  });
});
