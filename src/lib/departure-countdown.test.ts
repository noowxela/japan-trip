import { describe, expect, it } from "vitest";
import {
  departureCountdown,
  departureInstant,
} from "@/lib/departure-countdown";
import type { Transit, TripDay } from "@/lib/types";

const DEP = "2026-11-10T10:30:00+09:00";
const depMs = new Date(DEP).getTime();
const H = 3_600_000;
const M = 60_000;

describe("departureCountdown", () => {
  it("3 days out → days", () => {
    expect(departureCountdown(DEP, depMs - 72 * H)).toEqual({ mode: "days" });
  });
  it("exactly 48h → days", () => {
    expect(departureCountdown(DEP, depMs - 48 * H)).toEqual({ mode: "days" });
  });
  it("47h → hours", () => {
    expect(departureCountdown(DEP, depMs - 47 * H)).toEqual({
      mode: "hours",
      hours: 47,
    });
  });
  it("47h59m → 48 hours (ceil)", () => {
    expect(departureCountdown(DEP, depMs - 48 * H + M)).toEqual({
      mode: "hours",
      hours: 48,
    });
  });
  it("100 min → 2 hours", () => {
    expect(departureCountdown(DEP, depMs - 100 * M)).toEqual({
      mode: "hours",
      hours: 2,
    });
  });
  it("30 min → minutes", () => {
    expect(departureCountdown(DEP, depMs - 30 * M)).toEqual({
      mode: "minutes",
      minutes: 30,
    });
  });
  it("past → departed", () => {
    expect(departureCountdown(DEP, depMs + M)).toEqual({ mode: "departed" });
    expect(departureCountdown(DEP, depMs)).toEqual({ mode: "departed" });
  });
  it("missing time → days fallback", () => {
    expect(departureCountdown(null, depMs - H)).toEqual({ mode: "days" });
    expect(departureCountdown("nope", depMs - H)).toEqual({ mode: "days" });
  });
});

const days: TripDay[] = [
  { id: "d1", name: "Day 1", date: "2026-11-10", city: null, status: null },
  { id: "d2", name: "Day 2", date: "2026-11-11", city: null, status: null },
];
function tr(p: Partial<Transit> & { id: string }): Transit {
  return {
    name: "",
    mode: null,
    from: "",
    to: "",
    date: null,
    bookingUrl: null,
    dayIds: [],
    start: null,
    order: null,
    visited: false,
    ...p,
  };
}

describe("departureInstant", () => {
  it("uses first day's flight start in Tokyo", () => {
    expect(
      departureInstant(days, [
        tr({ id: "b", mode: "Metro", dayIds: ["d1"], start: "2026-11-10T08:00" }),
        tr({ id: "f", mode: "Flight", dayIds: ["d1"], start: "2026-11-10T10:30" }),
      ]),
    ).toBe(DEP);
  });
  it("no timed transit → null", () => {
    expect(
      departureInstant(days, [tr({ id: "f", mode: "Flight", dayIds: ["d1"] })]),
    ).toBeNull();
  });
});
