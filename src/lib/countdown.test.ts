import { describe, expect, it } from "vitest";
import {
  calendarDateKeyFrom,
  calendarDayDiff,
  computeCountdown,
  type CountdownTripData,
} from "@/lib/countdown";
import type { Place, PrepItem, Transit, TripDay } from "@/lib/types";

function day(partial: Partial<TripDay> & { id: string; name: string }): TripDay {
  return {
    date: null,
    city: null,
    status: null,
    ...partial,
  };
}

function place(partial: Partial<Place> & { id: string; name: string }): Place {
  return {
    type: null,
    mapsUrl: null,
    notes: "",
    visited: false,
    dayIds: [],
    start: null,
    lat: null,
    lng: null,
    pending: false,
    ...partial,
  };
}

function transit(
  partial: Partial<Transit> & { id: string; name: string },
): Transit {
  return {
    mode: null,
    from: "",
    to: "",
    date: null,
    bookingUrl: null,
    dayIds: [],
    start: null,
    order: null,
    ...partial,
  };
}

function prep(partial: Partial<PrepItem> & { id: string; name: string }): PrepItem {
  return {
    done: false,
    order: null,
    ...partial,
  };
}

/** Fixed trip: 2026-10-25 … 2026-11-01 */
function baseTrip(extra: Partial<CountdownTripData> = {}): CountdownTripData {
  return {
    days: [
      day({ id: "d1", name: "Day 1 Tokyo", date: "2026-10-25", city: "Tokyo" }),
      day({ id: "d2", name: "Day 2 Tokyo", date: "2026-10-26", city: "Tokyo" }),
      day({ id: "d3", name: "Day 3 Tokyo", date: "2026-10-27", city: "Tokyo" }),
      day({ id: "d8", name: "Day 8 Osaka", date: "2026-11-01", city: "Osaka" }),
    ],
    places: [],
    transit: [],
    prep: [],
    ...extra,
  };
}

describe("calendarDateKeyFrom / calendarDayDiff", () => {
  it("maps MYT midnight edges from UTC instants", () => {
    // 2026-10-24 23:59 MYT = 15:59 UTC
    expect(
      calendarDateKeyFrom(new Date("2026-10-24T15:59:00.000Z"), "Asia/Kuala_Lumpur"),
    ).toBe("2026-10-24");
    // 2026-10-25 00:00 MYT = 16:00 UTC
    expect(
      calendarDateKeyFrom(new Date("2026-10-24T16:00:00.000Z"), "Asia/Kuala_Lumpur"),
    ).toBe("2026-10-25");
  });

  it("diffs calendar keys via UTC noon", () => {
    expect(calendarDayDiff("2026-10-17", "2026-10-25")).toBe(8);
    expect(calendarDayDiff("2026-10-25", "2026-10-25")).toBe(0);
    expect(calendarDayDiff("2026-10-25", "2026-11-01")).toBe(7);
  });
});

describe("computeCountdown", () => {
  it("returns null with no dated days", () => {
    expect(
      computeCountdown(
        { days: [day({ id: "x", name: "No date" })] },
        new Date("2026-10-20T01:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("returns null the day after trip end", () => {
    expect(
      computeCountdown(baseTrip(), new Date("2026-11-02T01:00:00.000Z")),
    ).toBeNull();
  });

  it("uses min/max dates even when days are unsorted", () => {
    const data: CountdownTripData = {
      days: [
        day({ id: "d8", name: "Last", date: "2026-11-01", city: "Osaka" }),
        day({ id: "d1", name: "First", date: "2026-10-25", city: "Tokyo" }),
      ],
      prep: [],
    };
    const msg = computeCountdown(
      data,
      new Date("2026-10-17T01:00:00.000Z"),
    );
    expect(msg?.title).toBe("还有 8 天出发去日本 🇯🇵");
    expect(msg?.id).toBe("countdown:2026-10-17");
    expect(msg?.url).toBe("/");
    expect(msg?.tag).toBe("countdown");
  });

  it("N=8 shows departure date body (no prep nudge beyond 7)", () => {
    const msg = computeCountdown(
      baseTrip({
        prep: [prep({ id: "p1", name: "签证" })],
      }),
      new Date("2026-10-17T01:00:00.000Z"),
    );
    expect(msg?.title).toBe("还有 8 天出发去日本 🇯🇵");
    expect(msg?.body).toMatch(/出发日/);
    expect(msg?.body).not.toMatch(/Prep/);
  });

  it("N=7 with unchecked prep lists up to 3 names", () => {
    const msg = computeCountdown(
      baseTrip({
        prep: [
          prep({ id: "p1", name: "签证" }),
          prep({ id: "p2", name: "换日元" }),
          prep({ id: "p3", name: "充电宝", done: true }),
          prep({ id: "p4", name: "药" }),
          prep({ id: "p5", name: "sim" }),
        ],
      }),
      new Date("2026-10-18T01:00:00.000Z"),
    );
    expect(msg?.title).toBe("还有 7 天出发去日本 🇯🇵");
    expect(msg?.body).toBe("Prep 还有 4 项未完成：签证、换日元、药…");
  });

  it("timezone edge: 15:59Z still previous MYT day; 16:00Z rolls N", () => {
    const data = baseTrip();
    const before = computeCountdown(
      data,
      new Date("2026-10-24T15:59:00.000Z"),
    );
    expect(before?.id).toBe("countdown:2026-10-24");
    expect(before?.title).toBe("明天出发去日本 🇯🇵");

    const after = computeCountdown(
      data,
      new Date("2026-10-24T16:00:00.000Z"),
    );
    expect(after?.id).toBe("countdown:2026-10-25");
    expect(after?.title).toBe("今天出发！🇯🇵");
  });

  it("N=1 tomorrow title + prep body rule", () => {
    const withPrep = computeCountdown(
      baseTrip({ prep: [prep({ id: "p1", name: "签证" })] }),
      new Date("2026-10-24T01:00:00.000Z"),
    );
    expect(withPrep?.title).toBe("明天出发去日本 🇯🇵");
    expect(withPrep?.body).toContain("Prep");

    const noPrep = computeCountdown(
      baseTrip(),
      new Date("2026-10-24T01:00:00.000Z"),
    );
    expect(noPrep?.body).toMatch(/出发日/);
  });

  it("departure day prefers first transit", () => {
    const msg = computeCountdown(
      baseTrip({
        transit: [
          transit({
            id: "t1",
            name: "MH88",
            from: "KUL",
            to: "HND",
            start: "2026-10-25T08:00:00+09:00",
            date: "2026-10-25",
          }),
        ],
        places: [
          place({
            id: "pl1",
            name: "Senso-ji",
            dayIds: ["d1"],
            start: "2026-10-25T15:00:00+09:00",
          }),
        ],
      }),
      new Date("2026-10-25T01:00:00.000Z"),
    );
    expect(msg?.title).toBe("今天出发！🇯🇵");
    expect(msg?.body).toBe("08:00 MH88 KUL→HND");
  });

  it("departure transit body skips route when name already contains it", () => {
    const msg = computeCountdown(
      baseTrip({
        transit: [
          transit({
            id: "t1",
            name: "MH88 KUL→HND",
            from: "KUL",
            to: "HND",
            start: "2026-10-25T08:00:00+09:00",
            date: "2026-10-25",
          }),
        ],
      }),
      new Date("2026-10-25T01:00:00.000Z"),
    );
    expect(msg?.body).toBe("08:00 MH88 KUL→HND");
  });

  it("departure transit body appends route when name does not include it", () => {
    const msg = computeCountdown(
      baseTrip({
        transit: [
          transit({
            id: "t1",
            name: "Nozomi to Kyoto",
            from: "Tokyo",
            to: "Kyoto",
            start: "2026-10-25T10:00:00+09:00",
            date: "2026-10-25",
          }),
        ],
      }),
      new Date("2026-10-25T01:00:00.000Z"),
    );
    expect(msg?.body).toBe("10:00 Nozomi to Kyoto Tokyo→Kyoto");
  });

  it("mid-trip title uses city + first stop; gap day omits city", () => {
    const mid = computeCountdown(
      baseTrip({
        places: [
          place({
            id: "pl1",
            name: "Senso-ji",
            dayIds: ["d3"],
            start: "2026-10-27T09:00:00+09:00",
          }),
        ],
      }),
      new Date("2026-10-27T01:00:00.000Z"),
    );
    expect(mid?.title).toBe("日本第 3 天 · 东京");
    expect(mid?.body).toBe("第一站 09:00 Senso-ji");

    // 2026-10-28 has no Day row but is within start..end
    const gap = computeCountdown(
      baseTrip(),
      new Date("2026-10-28T01:00:00.000Z"),
    );
    expect(gap?.title).toBe("日本第 4 天");
    expect(gap?.body).toMatch(/行程第 4 天/);
  });

  it("last day appends 最后一天", () => {
    const msg = computeCountdown(
      baseTrip({
        places: [
          place({
            id: "pl1",
            name: "Dotonbori",
            dayIds: ["d8"],
            start: "2026-11-01T10:30:00+09:00",
          }),
        ],
      }),
      new Date("2026-11-01T01:00:00.000Z"),
    );
    expect(msg?.title).toBe("日本第 8 天 · 大阪 · 最后一天");
    expect(msg?.body).toBe("第一站 10:30 Dotonbori");
  });

  it("en locale equivalents", () => {
    const n8 = computeCountdown(
      baseTrip(),
      new Date("2026-10-17T01:00:00.000Z"),
      { locale: "en" },
    );
    expect(n8?.title).toBe("8 days until Japan 🇯🇵");
    expect(n8?.body).toMatch(/^Departure /);

    const dep = computeCountdown(
      baseTrip({
        transit: [
          transit({
            id: "t1",
            name: "MH88",
            from: "KUL",
            to: "HND",
            start: "2026-10-25T08:00:00+09:00",
          }),
        ],
      }),
      new Date("2026-10-25T01:00:00.000Z"),
      { locale: "en" },
    );
    expect(dep?.title).toBe("Departure day! 🇯🇵");

    const mid = computeCountdown(
      baseTrip({
        places: [
          place({
            id: "pl1",
            name: "Senso-ji",
            dayIds: ["d3"],
            start: "2026-10-27T09:00:00+09:00",
          }),
        ],
      }),
      new Date("2026-10-27T01:00:00.000Z"),
      { locale: "en" },
    );
    expect(mid?.title).toBe("Japan day 3 · Tokyo");
    expect(mid?.body).toBe("First stop 09:00 Senso-ji");
  });
});
