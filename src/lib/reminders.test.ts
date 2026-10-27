import { describe, expect, it } from "vitest";
import type { PrepItem, Stay, Transit, TripDay } from "@/lib/types";
import {
  addCalendarDays,
  computeReminders,
  tokyoDateKeyFrom,
  type ReminderTripData,
} from "@/lib/reminders";

function day(partial: Partial<TripDay> & { id: string; name: string }): TripDay {
  return {
    date: null,
    city: null,
    status: null,
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

function stay(partial: Partial<Stay> & { id: string; name: string }): Stay {
  return {
    checkIn: null,
    checkOut: null,
    address: "",
    bookingUrl: null,
    confirmation: "",
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

/** Instant that is `yyyy-mm-dd` wall date in Asia/Tokyo (noon JST). */
function tokyoNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+09:00`);
}

const empty: ReminderTripData = {
  days: [],
  transit: [],
  stays: [],
  prep: [],
};

describe("tokyoDateKeyFrom / addCalendarDays", () => {
  it("reads the Tokyo calendar day across UTC midnight edges", () => {
    // 2026-10-28 00:30 JST == 2026-10-27 15:30 UTC
    expect(tokyoDateKeyFrom(new Date("2026-10-27T15:30:00.000Z"))).toBe(
      "2026-10-28",
    );
    // Still 2026-10-27 in Tokyo: 2026-10-27 14:00 UTC = 23:00 JST
    expect(tokyoDateKeyFrom(new Date("2026-10-27T14:00:00.000Z"))).toBe(
      "2026-10-27",
    );
  });

  it("adds calendar days without TZ drift", () => {
    expect(addCalendarDays("2026-10-27", 1)).toBe("2026-10-28");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCalendarDays("bad", 1)).toBe("");
  });
});

describe("computeReminders", () => {
  it("returns empty with no data", () => {
    expect(computeReminders(empty, tokyoNoon("2026-10-27"))).toEqual([]);
  });

  it("returns empty for a past trip", () => {
    const data: ReminderTripData = {
      days: [
        day({ id: "d1", name: "D1", date: "2026-09-01" }),
        day({ id: "d2", name: "D2", date: "2026-09-05" }),
      ],
      transit: [
        transit({
          id: "t1",
          name: "Shinkansen",
          mode: "Shinkansen",
          from: "Tokyo",
          to: "Kyoto",
          start: "2026-09-02T10:00:00+09:00",
        }),
      ],
      stays: [stay({ id: "s1", name: "Hotel", checkIn: "2026-09-01" })],
      prep: [prep({ id: "p1", name: "Passport", done: false })],
    };
    expect(computeReminders(data, tokyoNoon("2026-10-27"))).toEqual([]);
  });

  it("emits tomorrow transit with time, route, and ticket hint (zh)", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d-kyoto", name: "Kyoto", date: "2026-10-28" })],
      transit: [
        transit({
          id: "t-shink",
          name: "Nozomi",
          mode: "Shinkansen",
          from: "东京",
          to: "京都",
          start: "2026-10-28T10:00:00+09:00",
        }),
        transit({
          id: "t-walk",
          name: "Walk",
          mode: "Walk",
          from: "A",
          to: "B",
          start: "2026-10-28T11:00:00+09:00",
        }),
        transit({
          id: "t-other",
          name: "Metro",
          mode: "Metro",
          from: "X",
          to: "Y",
          start: "2026-10-29T09:00:00+09:00",
        }),
      ],
      stays: [],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"), {
      includeDepartureTomorrow: false,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      id: "transit:t-shink:2026-10-28",
      title: "明天 10:00 新干线",
      body: "东京→京都，记得取票",
      url: "/schedule?day=d-kyoto",
      tag: "transit-t-shink",
    });
  });

  it("handles multiple tomorrow transit legs and metro early hint", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-28" })],
      transit: [
        transit({
          id: "t1",
          name: "Flight",
          mode: "Flight",
          from: "KUL",
          to: "HND",
          start: "2026-10-28T08:15:00+09:00",
        }),
        transit({
          id: "t2",
          name: "Metro",
          mode: "Metro",
          from: "Shinjuku",
          to: "Shibuya",
          start: "2026-10-28T18:00:00+09:00",
        }),
      ],
      stays: [],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"), {
      includeDepartureTomorrow: false,
    });
    expect(reminders.map((r) => r.id)).toEqual([
      "transit:t1:2026-10-28",
      "transit:t2:2026-10-28",
    ]);
    expect(reminders[0]!.body).toContain("记得取票");
    expect(reminders[1]!.body).toContain("提前到站");
  });

  it("emits hotel check-in tomorrow with optional time", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-28" })],
      transit: [],
      stays: [
        stay({
          id: "s1",
          name: "京都旅馆",
          checkIn: "2026-10-28T15:00:00+09:00",
        }),
        stay({ id: "s2", name: "Other", checkIn: "2026-10-29" }),
      ],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"), {
      includeDepartureTomorrow: false,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      id: "stay:s1:2026-10-28",
      title: "明天入住",
      body: "京都旅馆，入住 15:00",
      url: "/stays",
    });
  });

  it("emits prep summary at configured thresholds (3 and 1)", () => {
    const data: ReminderTripData = {
      days: [
        day({ id: "d1", name: "D1", date: "2026-10-30" }),
        day({ id: "d2", name: "D2", date: "2026-11-05" }),
      ],
      transit: [],
      stays: [],
      prep: [
        prep({ id: "p1", name: "护照", done: false }),
        prep({ id: "p2", name: "JR Pass", done: false }),
        prep({ id: "p3", name: "保险", done: false }),
        prep({ id: "p4", name: "Suica", done: true }),
      ],
    };

    const at3 = computeReminders(data, tokyoNoon("2026-10-27"));
    expect(at3).toHaveLength(1);
    expect(at3[0]!.id).toBe("prep:3:2026-10-30");
    expect(at3[0]!.body).toContain("护照");
    expect(at3[0]!.url).toBe("/prep");

    const at1 = computeReminders(data, tokyoNoon("2026-10-29"));
    expect(at1.some((r) => r.id === "prep:1:2026-10-30")).toBe(true);

    const at2 = computeReminders(data, tokyoNoon("2026-10-28"));
    expect(at2.some((r) => r.id.startsWith("prep:"))).toBe(false);
  });

  it("skips prep reminder when all items are done", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-30" })],
      transit: [],
      stays: [],
      prep: [prep({ id: "p1", name: "护照", done: true })],
    };
    expect(computeReminders(data, tokyoNoon("2026-10-27"))).toEqual([]);
  });

  it("emits departure-tomorrow when first day is tomorrow", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-28" })],
      transit: [],
      stays: [],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"));
    expect(reminders).toEqual([
      expect.objectContaining({
        id: "departure:2026-10-28",
        title: "明天出发",
        url: "/",
        tag: "departure",
      }),
    ]);
  });

  it("can disable departure-tomorrow", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-28" })],
      transit: [],
      stays: [],
      prep: [],
    };
    expect(
      computeReminders(data, tokyoNoon("2026-10-27"), {
        includeDepartureTomorrow: false,
      }),
    ).toEqual([]);
  });

  it("dedupes stable ids and supports en locale", () => {
    const data: ReminderTripData = {
      days: [day({ id: "d1", name: "D1", date: "2026-10-28" })],
      transit: [
        transit({
          id: "t1",
          name: "Nozomi",
          mode: "Shinkansen",
          from: "Tokyo",
          to: "Kyoto",
          start: "2026-10-28T10:00:00+09:00",
          date: "2026-10-28T10:00:00+09:00",
        }),
      ],
      stays: [],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"), {
      locale: "en",
      includeDepartureTomorrow: false,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]!.title).toBe("Tomorrow 10:00 Shinkansen");
    expect(reminders[0]!.body).toContain("Remember to collect tickets");
  });

  it("matches transit date-only fields for tomorrow", () => {
    const data: ReminderTripData = {
      days: [],
      transit: [
        transit({
          id: "t1",
          name: "Bus",
          mode: "Bus",
          from: "A",
          to: "B",
          date: "2026-10-28",
          start: null,
        }),
      ],
      stays: [],
      prep: [],
    };
    const reminders = computeReminders(data, tokyoNoon("2026-10-27"), {
      includeDepartureTomorrow: false,
    });
    expect(reminders[0]!.id).toBe("transit:t1:2026-10-28");
    expect(reminders[0]!.url).toBe("/schedule");
  });
});
