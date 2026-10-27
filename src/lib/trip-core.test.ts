import { describe, expect, it } from "vitest";
import { nextAgendaItem, tripPhase } from "@/lib/trip-core";
import type { AgendaItem, TripDay } from "@/lib/types";

const item = (id: string, kind: "place" | "transit", start: string | null, visited = false): AgendaItem => ({
  id, kind, name: id, chip: null, detail: "", start, order: null, ...(kind === "place" ? { visited } : {}),
});
const at = (hhmm: string) => new Date(`2026-10-27T${hhmm}:00+09:00`);
const agenda = [
  item("metro", "transit", "2026-10-27T09:00:00+09:00"),
  item("shrine", "place", "2026-10-27T09:30:00+09:00"),
  item("lunch", "place", "2026-10-27T13:00:00+09:00"),
  item("untimed", "place", null),
];

describe("nextAgendaItem", () => {
  it("returns first item as next before the day starts", () => {
    expect(nextAgendaItem(agenda, { now: at("08:00"), isToday: true })).toEqual({ item: agenda[0], status: "next" });
  });
  it("skips transit once its time has passed", () => {
    expect(nextAgendaItem(agenda, { now: at("09:10"), isToday: true })?.item.id).toBe("shrine");
  });
  it("keeps the current place as 'now' until the next item starts", () => {
    expect(nextAgendaItem(agenda, { now: at("10:00"), isToday: true })).toEqual({ item: agenda[1], status: "now" });
  });
  it("skips earlier places once a later item has started", () => {
    expect(nextAgendaItem(agenda, { now: at("13:30"), isToday: true })).toEqual({ item: agenda[2], status: "now" });
  });
  it("skips visited places", () => {
    const a = [agenda[0], item("shrine", "place", agenda[1].start, true), agenda[2]];
    expect(nextAgendaItem(a, { now: at("09:10"), isToday: true })?.item.id).toBe("lunch");
  });
  it("falls through to untimed items late in the day", () => {
    const a = [agenda[0], agenda[3]];
    expect(nextAgendaItem(a, { now: at("22:00"), isToday: true })).toEqual({ item: agenda[3], status: "next" });
  });
  it("ignores the clock for non-today days", () => {
    expect(nextAgendaItem(agenda, { now: at("23:00"), isToday: false })?.item.id).toBe("metro");
  });
  it("returns null when everything is visited", () => {
    expect(nextAgendaItem([item("x", "place", null, true)], { now: at("10:00"), isToday: true })).toBeNull();
  });
});

describe("tripPhase", () => {
  const days: TripDay[] = [
    { id: "1", name: "d1", date: "2026-10-25", city: null, status: null },
    { id: "2", name: "d2", date: "2026-11-01", city: null, status: null },
  ];
  it("classifies dates", () => {
    expect(tripPhase(days, "2026-10-20")).toBe("before");
    expect(tripPhase(days, "2026-10-27")).toBe("during");
    expect(tripPhase(days, "2026-11-02")).toBe("after");
    expect(tripPhase([], "2026-10-27")).toBe("none");
  });
});
