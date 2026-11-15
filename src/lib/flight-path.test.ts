import { describe, expect, it } from "vitest";
import {
  flightArcPath,
  flightArcPose,
  flightListLinks,
  flightLoopProgress,
  flightMapArcs,
  flightRoutesFromTransit,
  greatCircle,
  visibleSampleRange,
} from "@/lib/flight-path";
import { buildAgenda } from "@/lib/trip-core";
import type { AgendaItem, Transit } from "@/lib/types";

function place(id: string, name: string): AgendaItem {
  return {
    id,
    kind: "place",
    name,
    chip: "Other",
    detail: "",
    start: null,
    order: null,
  };
}

function flight(
  id: string,
  from: string,
  to: string,
  name = id,
): AgendaItem {
  return {
    id,
    kind: "transit",
    name,
    chip: "Flight",
    detail: `${from} → ${to}`,
    from,
    to,
    start: null,
    order: null,
  };
}

const transit = (over: Partial<Transit> & Pick<Transit, "id" | "mode">): Transit => ({
  name: over.id,
  from: "",
  to: "",
  date: null,
  bookingUrl: null,
  dayIds: [],
  start: null,
  order: null,
  visited: false,
  notes: "",
  skipped: false,
  ...over,
});

describe("flightListLinks", () => {
  it("joins the KLIA departure row to the Kansai airport row", () => {
    const agenda = [
      flight("depart", "KLIA", "osaka - Kansai", "DEpart"),
      place("kix", "Kansai International Airport"),
      place("shop", "UNITED ARROWS LUCUA OSAKA"),
    ];
    expect(flightListLinks(agenda)).toEqual([{ fromId: "depart", toId: "kix" }]);
  });

  it("joins a return flight to the later KLIA place, not the airport above it", () => {
    const agenda = [
      place("kix", "Kansai International Airport"),
      place("note", "Returning flight departure"),
      flight("ret", "osaka - Kansai", "KLIA", "return fligrt"),
      place("kul", "reach KLIA Malaysia"),
    ];
    expect(flightListLinks(agenda)).toEqual([{ fromId: "ret", toId: "kul" }]);
  });

  it("accepts a destination written only as KIX", () => {
    expect(
      flightListLinks([
        flight("depart", "KLIA", "KIX"),
        place("kix", "Kansai International Airport"),
      ]),
    ).toEqual([{ fromId: "depart", toId: "kix" }]);
  });

  it("links consecutive flight segments when no airport place is on the day", () => {
    expect(
      flightListLinks([flight("a", "KLIA", "KIX"), flight("b", "KIX", "HND")]),
    ).toEqual([{ fromId: "a", toId: "b" }]);
  });

  it("ignores trains and an Osaka shop that only shares the city word", () => {
    const train: AgendaItem = { ...flight("jr", "Tokyo", "Kyoto"), chip: "Shinkansen" };
    expect(flightListLinks([train, place("kyoto", "Kyoto Station")])).toEqual([]);
    expect(
      flightListLinks([
        flight("depart", "KLIA", "osaka - Kansai"),
        place("shop", "UNITED ARROWS LUCUA OSAKA"),
      ]),
    ).toEqual([]);
  });

  it("reads endpoints from the detail line when from/to were not copied", () => {
    const row = flight("depart", "KLIA", "osaka - Kansai", "DEpart");
    delete row.from;
    delete row.to;
    expect(
      flightListLinks([row, place("kix", "Kansai International Airport")]),
    ).toEqual([{ fromId: "depart", toId: "kix" }]);
  });
});

describe("flightMapArcs", () => {
  const kansai = {
    id: "kix",
    name: "Kansai International Airport",
    lat: 34.4342,
    lng: 135.2442,
  };
  const klia = {
    id: "kul",
    name: "reach KLIA Malaysia",
    lat: 2.74313,
    lng: 101.7064,
  };

  it("flies KLIA → Kansai using the landmark when only the arrival is pinned", () => {
    const [arc] = flightMapArcs(
      [{ id: "depart", from: "KLIA", to: "osaka - Kansai" }],
      [kansai],
    );
    expect(arc.to).toEqual({ lat: kansai.lat, lng: kansai.lng });
    expect(arc.from.lat).toBeCloseTo(2.74, 1);
    expect(arc.from.lng).toBeCloseTo(101.7, 0);
  });

  it("uses both day pins for the return flight", () => {
    const [arc] = flightMapArcs(
      [{ id: "ret", from: "osaka - Kansai", to: "KLIA" }],
      [kansai, klia],
    );
    expect(arc.from).toEqual({ lat: kansai.lat, lng: kansai.lng });
    expect(arc.to).toEqual({ lat: klia.lat, lng: klia.lng });
  });

  it("drops the arc when the matched airport pin is hidden", () => {
    expect(
      flightMapArcs(
        [{ id: "depart", from: "KLIA", to: "osaka - Kansai" }],
        [kansai],
        new Set(["kix"]),
      ),
    ).toEqual([]);
  });

  it("keeps only Flight rows", () => {
    expect(
      flightRoutesFromTransit([
        transit({ id: "jr", mode: "Shinkansen", from: "Tokyo", to: "Kyoto" }),
        transit({ id: "f", mode: "Flight", from: "KLIA", to: "KIX" }),
        transit({ id: "blank", mode: "Flight" }),
      ]),
    ).toEqual([{ id: "f", from: "KLIA", to: "KIX" }]);
  });
});

describe("flight geometry", () => {
  it("bows the list arc toward the gutter", () => {
    expect(flightArcPath(56, 10, 120)).toBe("M 56 10 Q 48 65 56 120");
    const mid = flightArcPose(56, 10, 120, 0.5);
    expect(mid.x).toBeLessThan(56);
    expect(mid.angle).toBeGreaterThan(45);
    expect(mid.angle).toBeLessThan(135);
  });

  it("keeps a KLIA–Kansai great circle between the airports", () => {
    const path = greatCircle(
      { lat: 2.74, lng: 101.71 },
      { lat: 34.43, lng: 135.24 },
      8,
    );
    expect(path[0]).toEqual({ lat: 2.74, lng: 101.71 });
    expect(path.at(-1)).toEqual({ lat: 34.43, lng: 135.24 });
    const mid = path[4];
    expect(mid.lat).toBeGreaterThan(5);
    expect(mid.lat).toBeLessThan(40);
    expect(mid.lng).toBeGreaterThan(90);
    expect(mid.lng).toBeLessThan(160);
  });

  it("clips to the on-screen approach and ignores a tiny stub", () => {
    expect(
      visibleSampleRange(
        [
          { x: -200, y: 0 },
          { x: -40, y: 20 },
          { x: 30, y: 40 },
          { x: 90, y: 80 },
        ],
        100,
        100,
      ),
    ).toEqual({ start: 1, end: 3 });
    expect(
      visibleSampleRange(
        [
          { x: 10, y: 10 },
          { x: 12, y: 10 },
        ],
        100,
        100,
      ),
    ).toBeNull();
  });

  it("eases along the leg and holds at the arrival", () => {
    expect(flightLoopProgress(0)).toBe(0);
    expect(flightLoopProgress(3500)).toBeCloseTo(0.5, 5);
    expect(flightLoopProgress(7000)).toBe(1);
    expect(flightLoopProgress(7500)).toBe(1);
    expect(flightLoopProgress(7900)).toBe(0);
  });
});

describe("buildAgenda flight endpoints", () => {
  it("copies from and to onto the flight row", () => {
    const [row] = buildAgenda(
      [],
      [
        transit({
          id: "depart",
          name: "DEpart",
          mode: "Flight",
          from: "KLIA",
          to: "osaka - Kansai",
        }),
      ],
    );
    expect(row).toMatchObject({
      chip: "Flight",
      from: "KLIA",
      to: "osaka - Kansai",
      detail: "KLIA → osaka - Kansai",
    });
  });
});
