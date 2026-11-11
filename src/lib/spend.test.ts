import { describe, expect, it } from "vitest";
import {
  BEFORE_TRIP_KEY,
  byDay,
  firstDatedTripDay,
  moneySummary,
  normalizeSplitWith,
  parseSpendCurrency,
  settleUp,
  timelineGroupLabel,
  timelineGroups,
  toRm,
} from "@/lib/spend";
import type { SpendItem, TripDay } from "@/lib/types";

const item = (
  partial: Partial<SpendItem> & Pick<SpendItem, "id" | "amount" | "currency">,
): SpendItem => ({
  name: partial.name ?? partial.id,
  kind: partial.kind ?? null,
  category: partial.category ?? null,
  notes: partial.notes ?? "",
  dayIds: partial.dayIds ?? [],
  start: partial.start ?? null,
  paidBy: partial.paidBy ?? null,
  splitWith: partial.splitWith ?? [],
  placeId: partial.placeId ?? null,
  ...partial,
});


const day = (
  partial: Partial<TripDay> & Pick<TripDay, "id">,
): TripDay => ({
  name: partial.name ?? partial.id,
  date: partial.date ?? null,
  city: partial.city ?? null,
  status: partial.status ?? null,
  ...partial,
});

describe("parseSpendCurrency", () => {
  it("accepts Yen and defaults everything else to RM", () => {
    expect(parseSpendCurrency("Yen")).toBe("Yen");
    expect(parseSpendCurrency("RM")).toBe("RM");
    expect(parseSpendCurrency(null)).toBe("RM");
    expect(parseSpendCurrency("usd")).toBe("RM");
  });
});

describe("toRm", () => {
  it("converts Yen with an explicit jpyPerRm and leaves RM alone", () => {
    expect(toRm(3930, "Yen", 39.3)).toBeCloseTo(100);
    expect(toRm(50, "RM", 39.3)).toBe(50);
    expect(toRm(400, "Yen", 40)).toBe(10);
  });
});

describe("byDay", () => {
  it("filters items that list the day id", () => {
    const items = [
      item({ id: "a", amount: 10, currency: "RM", dayIds: ["d1"] }),
      item({ id: "b", amount: 20, currency: "RM", dayIds: ["d2", "d1"] }),
      item({ id: "c", amount: 30, currency: "RM", dayIds: ["d3"] }),
    ];
    expect(byDay(items, "d1").map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("moneySummary", () => {
  it("sums estimate vs actual in RM using jpyPerRm for Yen rows", () => {
    const items = [
      item({ id: "e1", amount: 100, currency: "RM", kind: "Estimate" }),
      item({ id: "e2", amount: 3930, currency: "Yen", kind: "Estimate" }),
      item({ id: "a1", amount: 40, currency: "RM", kind: "Actual" }),
      item({ id: "a2", amount: 786, currency: "Yen", kind: "Actual" }),
    ];
    const jpyPerRm = 39.3;
    expect(moneySummary(items, jpyPerRm)).toEqual({
      estimate: 200,
      actual: 60,
      remaining: 140,
    });
  });
});

describe("normalizeSplitWith", () => {
  const people = ["Alex", "Ben", "Cara"];

  it("stores empty when the selection is exactly everyone", () => {
    expect(normalizeSplitWith(["Cara", "Alex", "Ben"], people)).toEqual([]);
  });

  it("keeps partial selections and extra names", () => {
    expect(normalizeSplitWith(["Alex", " Ben ", "Alex"], people)).toEqual(["Alex", "Ben"]);
    expect(normalizeSplitWith([...people, "Dan"], people)).toEqual([...people, "Dan"]);
    expect(normalizeSplitWith(["Alex"], [])).toEqual(["Alex"]);
  });
});

describe("settleUp", () => {
  const people = ["Alex", "Ben", "Cara"];
  const actual = (
    partial: Partial<SpendItem> & Pick<SpendItem, "id" | "amount">,
  ) => item({ currency: "RM", kind: "Actual", ...partial });
  const net = (result: ReturnType<typeof settleUp>) =>
    Object.fromEntries(
      result.balances.map((row) => [row.name, Math.round(row.netRm * 100) / 100]),
    );

  it("splits equally among everyone when Split with is empty", () => {
    const result = settleUp([actual({ id: "a", amount: 90, paidBy: "Alex" })], people);
    expect(net(result)).toEqual({ Alex: 60, Ben: -30, Cara: -30 });
    expect(result.transfers).toEqual([
      { from: "Ben", to: "Alex", rm: 30 },
      { from: "Cara", to: "Alex", rm: 30 },
    ]);
  });

  it("splits only among listed people, payer may be excluded", () => {
    const result = settleUp(
      [
        actual({ id: "a", amount: 40, paidBy: "Alex", splitWith: ["Ben", "Cara"] }),
        actual({ id: "b", amount: 10, paidBy: "Ben", splitWith: ["Ben"] }),
      ],
      people,
    );
    expect(net(result)).toEqual({ Alex: 40, Ben: -20, Cara: -20 });
    expect(result.balances.find((row) => row.name === "Ben")).toMatchObject({
      paidRm: 10,
      shareRm: 30,
    });
  });

  it("converts Yen, skips estimates, and reports missing payers", () => {
    const result = settleUp(
      [
        actual({ id: "y", amount: 3930, currency: "Yen", paidBy: "Cara", splitWith: ["Alex", "Cara"] }),
        item({ id: "e", amount: 500, currency: "RM", kind: "Estimate", paidBy: "Alex" }),
        actual({ id: "u", amount: 20 }),
      ],
      people,
      39.3,
    );
    expect(net(result)).toEqual({ Alex: -50, Ben: 0, Cara: 50 });
    expect(result.transfers).toEqual([{ from: "Alex", to: "Cara", rm: 50 }]);
    expect(result.unassigned.map((row) => row.id)).toEqual(["u"]);
  });

  it("keeps names that are no longer editors and rounds to cents", () => {
    const result = settleUp(
      [actual({ id: "a", amount: 100, paidBy: "Dan", splitWith: ["Alex", "Ben", "Dan"] })],
      people,
    );
    expect(result.balances.map((row) => row.name)).toEqual(["Alex", "Ben", "Cara", "Dan"]);
    expect(result.transfers).toEqual([
      { from: "Alex", to: "Dan", rm: 33.33 },
      { from: "Ben", to: "Dan", rm: 33.33 },
    ]);
  });

  it("needs at most n-1 transfers and nets to zero", () => {
    const result = settleUp(
      [
        actual({ id: "1", amount: 120, paidBy: "Alex" }),
        actual({ id: "2", amount: 45, paidBy: "Ben", splitWith: ["Ben", "Cara"] }),
        actual({ id: "3", amount: 33, paidBy: "Cara", splitWith: ["Alex", "Cara"] }),
      ],
      people,
    );
    expect(result.transfers.length).toBeLessThanOrEqual(people.length - 1);
    const total = result.balances.reduce((sum, row) => sum + row.netRm, 0);
    expect(Math.abs(total)).toBeLessThan(1e-9);
    const after = new Map(result.balances.map((row) => [row.name, Math.round(row.netRm * 100)]));
    for (const transfer of result.transfers) {
      after.set(transfer.from, (after.get(transfer.from) ?? 0) + Math.round(transfer.rm * 100));
      after.set(transfer.to, (after.get(transfer.to) ?? 0) - Math.round(transfer.rm * 100));
    }
    for (const cents of after.values()) expect(Math.abs(cents)).toBeLessThanOrEqual(1);
  });

  it("falls back to payers when there is no Editors list", () => {
    const result = settleUp(
      [
        actual({ id: "a", amount: 10, paidBy: "Alex" }),
        actual({ id: "b", amount: 30, paidBy: "Ben" }),
      ],
      [],
    );
    expect(result.transfers).toEqual([{ from: "Alex", to: "Ben", rm: 10 }]);
  });

  it("is empty with no expenses", () => {
    expect(settleUp([], people)).toEqual({
      balances: people.map((name) => ({ name, paidRm: 0, shareRm: 0, netRm: 0 })),
      transfers: [],
      unassigned: [],
    });
  });
});

describe("firstDatedTripDay", () => {
  it("returns the earliest dated trip day and ignores undated days", () => {
    const days = [
      day({ id: "d2", date: "2026-11-09" }),
      day({ id: "undated" }),
      day({ id: "d1", date: "2026-11-08" }),
    ];
    expect(firstDatedTripDay(days)).toBe("2026-11-08");
    expect(firstDatedTripDay([])).toBeNull();
    expect(firstDatedTripDay([day({ id: "x" })])).toBeNull();
  });
});

describe("timelineGroups", () => {
  const days = [
    day({ id: "d1", name: "Day 1", date: "2026-11-08" }),
    day({ id: "d2", name: "Day 2", date: "2026-11-09" }),
  ];

  it("puts undated items and pre-trip purchases in one before-trip group first", () => {
    const items = [
      item({ id: "esim", name: "Xummer eSIM", amount: 43, currency: "RM" }),
      item({
        id: "flights",
        name: "Round Trip Flights",
        amount: 2000,
        currency: "RM",
        start: "2026-02-08",
      }),
      item({
        id: "hotel",
        name: "Mitsui Garden",
        amount: 800,
        currency: "RM",
        start: "2026-08-25",
      }),
      item({
        id: "lunch",
        name: "Lunch",
        amount: 20,
        currency: "RM",
        dayIds: ["d1"],
      }),
      item({
        id: "after",
        name: "Souvenir after trip",
        amount: 15,
        currency: "RM",
        start: "2026-11-20",
      }),
    ];
    const groups = timelineGroups(items, days);
    expect(groups.map((group) => group.key)).toEqual([
      BEFORE_TRIP_KEY,
      "2026-11-08",
      "2026-11-20",
    ]);
    const before = groups[0]!;
    expect(before.date).toBeNull();
    expect(before.items.map((row) => row.id)).toEqual(["flights", "hotel", "esim"]);
    expect(before.totalRm).toBe(2843);
    expect(groups[1]!.items.map((row) => row.id)).toEqual(["lunch"]);
    expect(groups[2]!.items.map((row) => row.id)).toEqual(["after"]);
  });

  it("keeps trip-day and on-or-after-first-day items in dated groups", () => {
    const items = [
      item({
        id: "day2",
        name: "Day 2 dinner",
        amount: 30,
        currency: "RM",
        dayIds: ["d2"],
      }),
      item({
        id: "same-day",
        name: "Arrival snack",
        amount: 8,
        currency: "RM",
        start: "2026-11-08",
      }),
    ];
    const groups = timelineGroups(items, days);
    expect(groups.map((group) => group.key)).toEqual(["2026-11-08", "2026-11-09"]);
    expect(groups.some((group) => group.key === BEFORE_TRIP_KEY)).toBe(false);
  });

  it("only sends undated items to before-trip when no trip day has a date", () => {
    const items = [
      item({ id: "esim", name: "eSIM", amount: 43, currency: "RM" }),
      item({
        id: "booked",
        name: "Flights",
        amount: 100,
        currency: "RM",
        start: "2026-02-08",
      }),
    ];
    const groups = timelineGroups(items, [day({ id: "d1" })]);
    expect(groups.map((group) => group.key)).toEqual([
      BEFORE_TRIP_KEY,
      "2026-02-08",
    ]);
    expect(groups[0]!.items.map((row) => row.id)).toEqual(["esim"]);
    expect(groups[1]!.items.map((row) => row.id)).toEqual(["booked"]);
  });
});

describe("timelineGroupLabel", () => {
  it("labels the before-trip group in zh and en, not as no date", () => {
    expect(timelineGroupLabel({ key: BEFORE_TRIP_KEY, date: null }, "zh")).toBe(
      "出发前",
    );
    expect(timelineGroupLabel({ key: BEFORE_TRIP_KEY, date: null }, "en")).toBe(
      "Before trip",
    );
    expect(timelineGroupLabel({ key: "2026-11-08", date: "2026-11-08" }, "en")).toBe(
      "Sun 8 Nov",
    );
  });
});

