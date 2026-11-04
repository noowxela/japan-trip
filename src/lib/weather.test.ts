import { describe, expect, it } from "vitest";
import type { TripDay } from "@/lib/types";
import {
  forecastRequests,
  isRainy,
  parseOpenMeteo,
  weatherGlyph,
  weatherKind,
  weatherShort,
} from "@/lib/weather";

function day(id: string, date: string | null, city: string | null): TripDay {
  return { id, name: id, date, city, status: null };
}

describe("weatherKind / weatherGlyph", () => {
  it("maps WMO codes to coarse kinds", () => {
    expect(weatherKind(0)).toBe("clear");
    expect(weatherKind(2)).toBe("partly");
    expect(weatherKind(3)).toBe("cloudy");
    expect(weatherKind(45)).toBe("fog");
    expect(weatherKind(53)).toBe("drizzle");
    expect(weatherKind(63)).toBe("rain");
    expect(weatherKind(81)).toBe("rain");
    expect(weatherKind(73)).toBe("snow");
    expect(weatherKind(86)).toBe("snow");
    expect(weatherKind(95)).toBe("storm");
    expect(weatherKind(42)).toBe("cloudy");
    expect(weatherGlyph(63)).toBe("🌧️");
  });
});

describe("weatherShort / isRainy", () => {
  it("rounds temps and shows rain % only from 20", () => {
    expect(weatherShort({ code: 63, tMin: 12.4, tMax: 16.6, rainPct: 80 })).toBe(
      "🌧️ 12–17° 80%",
    );
    expect(weatherShort({ code: 0, tMin: 8, tMax: 18, rainPct: 10 })).toBe(
      "☀️ 8–18°",
    );
    expect(weatherShort({ code: 0, tMin: 8, tMax: 18, rainPct: null })).toBe(
      "☀️ 8–18°",
    );
  });

  it("is rainy at 50% and above", () => {
    expect(isRainy({ code: 3, tMin: 0, tMax: 0, rainPct: 50 })).toBe(true);
    expect(isRainy({ code: 3, tMin: 0, tMax: 0, rainPct: 49 })).toBe(false);
    expect(isRainy({ code: 3, tMin: 0, tMax: 0, rainPct: null })).toBe(false);
    expect(isRainy(undefined)).toBe(false);
  });
});

describe("forecastRequests", () => {
  const days = [
    day("d0", "2026-11-03", "Tokyo"),
    day("d1", "2026-11-05", "Tokyo"),
    day("d2", "2026-11-07T00:00:00+09:00", "Kyoto"),
    day("d3", "2026-11-08", "Tokyo"),
    day("d4", "2026-11-09", "Other"),
    day("d5", null, "Osaka"),
    day("d6", "2026-11-20", "Osaka"),
  ];

  it("groups by city inside [today, today+15] and skips unknown coords", () => {
    const requests = forecastRequests(days, "2026-11-04");
    expect(requests).toEqual([
      {
        city: "Tokyo",
        lat: 35.6812,
        lng: 139.7671,
        start: "2026-11-05",
        end: "2026-11-08",
        dates: ["2026-11-05", "2026-11-08"],
      },
      {
        city: "Kyoto",
        lat: 35.0116,
        lng: 135.7681,
        start: "2026-11-07",
        end: "2026-11-07",
        dates: ["2026-11-07"],
      },
    ]);
  });

  it("includes the last forecast day (today + 15)", () => {
    const requests = forecastRequests([day("x", "2026-11-19", "Osaka")], "2026-11-04");
    expect(requests.map((r) => r.end)).toEqual(["2026-11-19"]);
    expect(
      forecastRequests([day("x", "2026-11-20", "Osaka")], "2026-11-04"),
    ).toEqual([]);
  });
});

describe("parseOpenMeteo", () => {
  const json = {
    daily: {
      time: ["2026-11-05", "2026-11-06", "2026-11-07"],
      weather_code: [63, 2, null],
      temperature_2m_max: [22.5, 21, 15.8],
      temperature_2m_min: [14.4, 13.3, 8.6],
      precipitation_probability_max: [81, null, 0],
    },
  };

  it("keeps wanted dates with complete values", () => {
    expect(parseOpenMeteo(json, ["2026-11-05", "2026-11-06", "2026-11-07"])).toEqual({
      "2026-11-05": { code: 63, tMax: 22.5, tMin: 14.4, rainPct: 81 },
      "2026-11-06": { code: 2, tMax: 21, tMin: 13.3, rainPct: null },
    });
    expect(parseOpenMeteo(json, ["2026-11-06"])).toEqual({
      "2026-11-06": { code: 2, tMax: 21, tMin: 13.3, rainPct: null },
    });
  });

  it("returns {} for error payloads", () => {
    expect(parseOpenMeteo({ error: true, reason: "out of range" }, ["2026-11-05"])).toEqual({});
    expect(parseOpenMeteo(null, ["2026-11-05"])).toEqual({});
  });
});
