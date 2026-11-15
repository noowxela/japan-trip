import { describe, expect, it } from "vitest";
import {
  countVisitedAllDays,
  isVisitedAllDaysItem,
  visitedAgendaByDay,
  visitedAgendaForDay,
} from "@/lib/all-days-agenda";
import type { Place, Transit, TripDay } from "@/lib/types";

const day = (id: string, name = id): TripDay => ({
  id,
  name,
  date: "2026-11-07",
  city: "Osaka",
  status: null,
});

const place = (partial: Partial<Place> & Pick<Place, "id" | "name">): Place => ({
  type: "Sight",
  mapsUrl: null,
  notes: "",
  visited: false,
  dayIds: ["d1"],
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
  mode: "Metro",
  from: "A",
  to: "B",
  date: null,
  bookingUrl: null,
  dayIds: ["d1"],
  start: null,
  order: null,
  visited: false,
  skipped: false,
  notes: "",
  ...partial,
});

describe("isVisitedAllDaysItem", () => {
  it("keeps only visited, non-pending, non-skipped rows", () => {
    expect(isVisitedAllDaysItem(place({ id: "v", name: "Castle", visited: true }))).toBe(
      true,
    );
    expect(isVisitedAllDaysItem(place({ id: "u", name: "Shop" }))).toBe(false);
    expect(
      isVisitedAllDaysItem(
        place({ id: "p", name: "Maybe", visited: true, pending: true }),
      ),
    ).toBe(false);
    expect(
      isVisitedAllDaysItem(
        place({ id: "s", name: "Skip", visited: true, skipped: true }),
      ),
    ).toBe(false);
  });

  it("honors visit/skip overlays", () => {
    expect(
      isVisitedAllDaysItem(place({ id: "a", name: "A" }), { visited: { a: true } }),
    ).toBe(true);
    expect(
      isVisitedAllDaysItem(place({ id: "b", name: "B", visited: true }), {
        skipped: { b: true },
      }),
    ).toBe(false);
  });
});

describe("visitedAgendaForDay / visitedAgendaByDay", () => {
  const visitedPlace = place({
    id: "castle",
    name: "Osaka Castle",
    visited: true,
    start: "2026-11-07T10:00:00+09:00",
  });
  const unvisited = place({ id: "shop", name: "Shop", start: "2026-11-07T11:00:00+09:00" });
  const pending = place({
    id: "maybe",
    name: "Maybe cafe",
    visited: true,
    pending: true,
  });
  const skipped = place({
    id: "skip",
    name: "Skipped shrine",
    visited: true,
    skipped: true,
  });
  const visitedTrain = transit({
    id: "metro",
    name: "Midosuji",
    visited: true,
    start: "2026-11-07T09:00:00+09:00",
  });
  const unvisitedTrain = transit({ id: "bus", name: "Airport bus" });
  const otherDay = place({
    id: "kyoto",
    name: "Fushimi",
    visited: true,
    dayIds: ["d2"],
  });

  const places = [visitedPlace, unvisited, pending, skipped, otherDay];
  const transits = [visitedTrain, unvisitedTrain];

  it("lists only visited places and transit for that day, in agenda order", () => {
    const items = visitedAgendaForDay("d1", places, transits);
    expect(items.map((item) => item.id)).toEqual(["metro", "castle"]);
    expect(items[0].kind).toBe("transit");
    expect(items[1].kind).toBe("place");
  });

  it("omits days with no visited stops and counts listed rows", () => {
    const groups = visitedAgendaByDay(
      [day("d1", "Day 1"), day("d2", "Day 2"), day("d3", "Day 3")],
      places,
      transits,
    );
    expect(groups.map((group) => group.day.id)).toEqual(["d1", "d2"]);
    expect(groups[0].items.map((item) => item.id)).toEqual(["metro", "castle"]);
    expect(groups[1].items.map((item) => item.id)).toEqual(["kyoto"]);
    expect(countVisitedAllDays(groups)).toBe(3);
  });
});
