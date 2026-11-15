import { describe, expect, it } from "vitest";
import {
  decodeScheduleLink,
  encodeScheduleLink,
  groupScheduleItemsByDay,
  linkedScheduleLabel,
  linkedSpendTotals,
  normalizeScheduleLink,
  scheduleItemsForDay,
  scheduleLinkOptionLabel,
  spendsForScheduleItem,
  suggestedSpendCategory,
  suggestedSpendCurrency,
} from "@/lib/spend-link";
import type { Place, SpendItem, Transit, TripDay } from "@/lib/types";

const place = (partial: Partial<Place> & Pick<Place, "id" | "name">): Place => ({
  type: partial.type ?? "Sight",
  mapsUrl: null,
  notes: "",
  visited: false,
  dayIds: partial.dayIds ?? ["d1"],
  start: null,
  lat: null,
  lng: null,
  pending: false,
  skipped: false,
  ...partial,
});

const transit = (
  partial: Partial<Transit> & Pick<Transit, "id" | "name">,
): Transit => ({
  mode: partial.mode ?? "Metro",
  from: "",
  to: "",
  date: null,
  bookingUrl: null,
  dayIds: partial.dayIds ?? ["d1"],
  start: null,
  order: null,
  visited: false,
  skipped: false,
  notes: "",
  ...partial,
});

const spend = (
  partial: Partial<SpendItem> & Pick<SpendItem, "id" | "amount" | "currency">,
): SpendItem => ({
  name: partial.name ?? partial.id,
  kind: "Actual",
  category: null,
  notes: "",
  dayIds: ["d1"],
  start: null,
  paidBy: null,
  splitWith: [],
  placeId: null,
  transitId: null,
  ...partial,
});

describe("normalizeScheduleLink", () => {
  it("keeps a single place or transit id", () => {
    expect(normalizeScheduleLink("p1", "")).toEqual({
      placeId: "p1",
      transitId: "",
    });
    expect(normalizeScheduleLink(null, "t1")).toEqual({
      placeId: "",
      transitId: "t1",
    });
  });

  it("XOR: transit wins when both are set", () => {
    expect(normalizeScheduleLink("p1", "t1")).toEqual({
      placeId: "",
      transitId: "t1",
    });
  });

  it("encodes and decodes a single link", () => {
    expect(encodeScheduleLink("p1", null)).toBe("place:p1");
    expect(decodeScheduleLink("transit:t1")).toEqual({
      placeId: "",
      transitId: "t1",
    });
    expect(decodeScheduleLink("")).toEqual({ placeId: "", transitId: "" });
  });
});

describe("scheduleItemsForDay", () => {
  const places = [
    place({ id: "ramen", name: "Ichiran", type: "Food", dayIds: ["d1"] }),
    place({ id: "temple", name: "Fushimi", type: "Sight", dayIds: ["d2"] }),
    place({
      id: "pending",
      name: "Maybe",
      type: "Cafe",
      dayIds: ["d1"],
      pending: true,
    }),
    place({
      id: "skipped",
      name: "Closed",
      type: "Shop",
      dayIds: ["d1"],
      skipped: true,
    }),
  ];
  const transits = [
    transit({
      id: "grab",
      name: "grab back from klia to desa",
      mode: "Ride-hailing",
      dayIds: ["d1"],
    }),
    transit({ id: "skipped-t", name: "Old bus", dayIds: ["d1"], skipped: true }),
  ];

  it("lists same-day places and transit, skipping pending and skipped", () => {
    expect(scheduleItemsForDay(places, transits, "d1").map((row) => row.id)).toEqual(
      ["grab", "ramen"],
    );
    expect(scheduleItemsForDay(places, transits, "d2").map((row) => row.id)).toEqual(
      ["temple"],
    );
    expect(scheduleItemsForDay(places, transits, "").map((row) => row.id)).toEqual(
      ["temple", "grab", "ramen"],
    );
  });

  it("sorts by start time, then keeps untimed items in existing order", () => {
    const timedPlaces = [
      place({
        id: "later",
        name: "Afternoon cafe",
        type: "Cafe",
        start: "2026-11-06T15:00:00+09:00",
      }),
      place({
        id: "untimed-b",
        name: "Z Shop",
        type: "Shop",
      }),
      place({
        id: "earlier",
        name: "Morning temple",
        type: "Sight",
        start: "2026-11-06T09:30:00+09:00",
      }),
      place({
        id: "untimed-a",
        name: "A Shop",
        type: "Shop",
      }),
    ];
    const timedTransit = [
      transit({
        id: "noon-train",
        name: "Metro hop",
        mode: "Metro",
        start: "2026-11-06T12:15:00+09:00",
      }),
    ];
    expect(
      scheduleItemsForDay(timedPlaces, timedTransit, "d1").map((row) => row.id),
    ).toEqual(["earlier", "noon-train", "later", "untimed-a", "untimed-b"]);
  });

  it("groups all items by day when the spend has no day", () => {
    const days: TripDay[] = [
      { id: "d1", name: "Day 1", date: "2026-11-06", city: null, status: null },
      { id: "d2", name: "Day 2", date: "2026-11-07", city: null, status: null },
    ];
    const groups = groupScheduleItemsByDay(
      scheduleItemsForDay(places, transits, ""),
      days,
    );
    expect(groups.map((group) => group.dayId)).toEqual(["d1", "d2"]);
    expect(groups[0].items.map((row) => row.id)).toEqual(["grab", "ramen"]);
    expect(groups[1].items.map((row) => row.id)).toEqual(["temple"]);
  });
});

describe("scheduleLinkOptionLabel", () => {
  it("formats time, icon/type, and name, and uses — when untimed", () => {
    expect(
      scheduleLinkOptionLabel(
        {
          kind: "place",
          chip: "Food",
          name: "Ichiran",
          start: "2026-11-06T11:40:00+09:00",
        },
        "Food",
      ),
    ).toBe("11:40 · 🍽️ Food · Ichiran");
    expect(
      scheduleLinkOptionLabel(
        {
          kind: "transit",
          chip: "Metro",
          name: "Karasuma line",
          start: null,
        },
        "Metro",
      ),
    ).toBe("— · 🚇 Metro · Karasuma line");
  });
});

describe("linked spends and totals", () => {
  const items = [
    spend({ id: "a", amount: 70, currency: "RM", transitId: "grab" }),
    spend({ id: "b", amount: 786, currency: "Yen", transitId: "grab" }),
    spend({ id: "c", amount: 20, currency: "RM", placeId: "ramen" }),
  ];

  it("filters spends for one schedule item", () => {
    expect(
      spendsForScheduleItem(items, { kind: "transit", id: "grab" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a", "b"]);
    expect(
      spendsForScheduleItem(items, { kind: "place", id: "ramen" }).map(
        (row) => row.id,
      ),
    ).toEqual(["c"]);
  });

  it("totals linked spends in RM and Yen", () => {
    const linked = spendsForScheduleItem(items, { kind: "transit", id: "grab" });
    const totals = linkedSpendTotals(linked, 39.3);
    expect(totals.count).toBe(2);
    expect(totals.rm).toBeCloseTo(70 + 786 / 39.3);
    expect(totals.yen).toBe(Math.round(totals.rm * 39.3));
  });

  it("labels a live or missing link", () => {
    const places = [place({ id: "ramen", name: "Ichiran", type: "Food" })];
    const transits = [
      transit({ id: "grab", name: "Grab", mode: "Ride-hailing" }),
    ];
    expect(
      linkedScheduleLabel({ placeId: null, transitId: "grab" }, places, transits),
    ).toEqual({ name: "Grab", missing: false });
    expect(
      linkedScheduleLabel({ placeId: "gone", transitId: null }, places, transits),
    ).toEqual({ name: "", missing: true });
    expect(
      linkedScheduleLabel({ placeId: null, transitId: null }, places, transits),
    ).toBeNull();
  });
});

describe("suggested spend category", () => {
  it("maps ride-hailing transit to Ride-hailing and RM", () => {
    expect(
      suggestedSpendCategory({ kind: "transit", chip: "Ride-hailing" }),
    ).toBe("Ride-hailing");
    expect(suggestedSpendCurrency("Ride-hailing")).toBe("RM");
    expect(suggestedSpendCategory({ kind: "transit", chip: "Flight" })).toBe(
      "Airfare",
    );
    expect(suggestedSpendCategory({ kind: "transit", chip: "Metro" })).toBe(
      "Transit",
    );
    expect(suggestedSpendCategory({ kind: "place", chip: "Food" })).toBe("Food");
    expect(suggestedSpendCategory({ kind: "place", chip: "Shop" })).toBe("Shop");
    expect(suggestedSpendCategory({ kind: "place", chip: "Sight" })).toBe(
      "Other",
    );
    expect(suggestedSpendCurrency("Food")).toBeUndefined();
  });
});
