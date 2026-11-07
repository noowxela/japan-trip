import { describe, expect, it } from "vitest";
import { buildAgenda, nextAgendaItem, tripPhase } from "@/lib/trip-core";
import type { AgendaItem, Place, Transit, TripDay } from "@/lib/types";

const item = (id: string, kind: "place" | "transit", start: string | null, visited = false): AgendaItem => ({
  id, kind, name: id, chip: null, detail: "", start, order: null, visited,
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
  it("skips visited transit", () => {
    const a = [item("metro", "transit", agenda[0].start, true), agenda[1]];
    expect(nextAgendaItem(a, { now: at("08:00"), isToday: true })?.item.id).toBe("shrine");
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

describe("nextAgendaItem: overnight flight (KLIA, 2026-11-06)", () => {
  // Live Day 1 data: flight stored as 02:15 JST, next item 09:24 JST.
  const flight: AgendaItem = {
    ...item("depart", "transit", "2026-11-06T02:15:00.000+09:00"),
    chip: "Flight",
    detail: "KLIA → osaka - Kansai",
  };
  const day = [
    flight,
    item("test", "place", "2026-11-06T09:24:00.000+09:00"),
    item("kix", "place", "2026-11-07T09:30:00.000+08:00"),
  ];
  it("keeps the flight current at 01:26 MYT (phone in UTC+8)", () => {
    const now = new Date("2026-11-06T01:26:00+08:00");
    expect(nextAgendaItem(day, { now, isToday: true })).toEqual({ item: flight, status: "now" });
  });
  it("is 'next' before departure", () => {
    const now = new Date("2026-11-06T00:30:00+08:00");
    expect(nextAgendaItem(day, { now, isToday: true })).toEqual({ item: flight, status: "next" });
  });
  it("moves on once the next item starts", () => {
    const now = new Date("2026-11-06T09:30:00+09:00");
    expect(nextAgendaItem(day, { now, isToday: true })?.item.id).toBe("test");
  });
  it("moves on after the in-flight window even with no later start", () => {
    const now = new Date("2026-11-06T11:00:00+09:00");
    expect(nextAgendaItem([flight, item("untimed", "place", null)], { now, isToday: true })?.item.id).toBe("untimed");
  });
  it("skips a visited flight even during the in-flight window", () => {
    const now = new Date("2026-11-06T01:26:00+08:00");
    const visitedFlight = { ...flight, visited: true };
    expect(nextAgendaItem([visitedFlight, day[1], day[2]], { now, isToday: true })?.item.id).toBe("test");
  });
});

describe("buildAgenda visited", () => {
  it("copies visited onto place and transit rows", () => {
    const places: Place[] = [{
      id: "p1",
      name: "Shrine",
      type: "Sight",
      mapsUrl: null,
      notes: "",
      visited: true,
      dayIds: [],
      start: "2026-11-06T09:00:00+09:00",
      lat: null,
      lng: null,
      pending: false,
    }];
    const transit: Transit[] = [{
      id: "t1",
      name: "DEpart",
      mode: "Flight",
      from: "KLIA",
      to: "KIX",
      date: "2026-11-06",
      bookingUrl: null,
      dayIds: [],
      start: "2026-11-06T02:15:00+09:00",
      order: 1,
      visited: true,
    }];
    const rows = buildAgenda(places, transit);
    expect(rows.find((row) => row.id === "t1")).toMatchObject({
      kind: "transit",
      visited: true,
      from: "KLIA",
      to: "KIX",
    });
    expect(rows.find((row) => row.id === "p1")).toMatchObject({
      kind: "place",
      visited: true,
    });
  });
});
