import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOsrmUrl,
  clearWalkingRouteCache,
  fetchWalkingRoute,
  formatWalkEta,
  getCachedWalkingRoute,
  isAbsurdWalkingDetour,
  OSRM_WALKING_URL,
  parseOsrmRouteResponse,
  positionsFromOsrmLngLat,
  quantizeCoord,
  shouldRefetchForOriginMove,
  straightLinePositions,
  straightWalkingRoute,
  walkingRouteCacheKey,
} from "@/lib/walking-route";

const from = { lat: 34.6687, lng: 135.5013 };
const to = { lat: 34.6525, lng: 135.5063 };

afterEach(() => {
  clearWalkingRouteCache();
});

describe("quantizeCoord / walkingRouteCacheKey", () => {
  it("rounds to cache grid", () => {
    expect(quantizeCoord(34.66874, 4)).toBe(34.6687);
    expect(walkingRouteCacheKey(from, to)).toBe(
      "34.6687|135.5013|34.6525|135.5063",
    );
  });
});

describe("straight / osrm parse", () => {
  it("builds a two-point straight path", () => {
    expect(straightLinePositions(from, to)).toEqual([
      [from.lat, from.lng],
      [to.lat, to.lng],
    ]);
    expect(straightWalkingRoute(from, to).source).toBe("straight");
  });

  it("flips OSRM lng/lat pairs", () => {
    expect(
      positionsFromOsrmLngLat([
        [135.5, 34.66],
        [135.51, 34.67],
      ]),
    ).toEqual([
      [34.66, 135.5],
      [34.67, 135.51],
    ]);
  });

  it("parses an Ok OSRM payload", () => {
    const result = parseOsrmRouteResponse(
      {
        code: "Ok",
        routes: [
          {
            distance: 1200,
            duration: 900,
            geometry: {
              coordinates: [
                [135.5013, 34.6687],
                [135.503, 34.66],
                [135.5063, 34.6525],
              ],
            },
          },
        ],
      },
      from,
      to,
    );
    expect(result.source).toBe("osrm");
    expect(result.positions).toHaveLength(3);
    expect(result.distanceMeters).toBe(1200);
    expect(result.durationSeconds).toBe(900);
  });

  it("falls back to straight on bad payloads", () => {
    expect(parseOsrmRouteResponse({ code: "NoRoute" }, from, to).source).toBe(
      "straight",
    );
    expect(parseOsrmRouteResponse(null, from, to).source).toBe("straight");
  });

  it("falls back to straight on absurd car-graph detours", () => {
    // ~73 m crow-flies across Midosuji; demo OSRM car graph returns ~1 km.
    const near = { lat: 34.66865, lng: 135.5012 };
    const across = { lat: 34.6687, lng: 135.502 };
    const result = parseOsrmRouteResponse(
      {
        code: "Ok",
        routes: [
          {
            distance: 1027.3,
            duration: 123.7,
            geometry: {
              coordinates: [
                [135.500335, 34.668654],
                [135.499, 34.67],
                [135.501986, 34.669441],
              ],
            },
          },
        ],
      },
      near,
      across,
    );
    expect(result.source).toBe("straight");
    expect(result.positions).toEqual([
      [near.lat, near.lng],
      [across.lat, across.lng],
    ]);
  });
});

describe("isAbsurdWalkingDetour", () => {
  it("flags short-hop car detours and high ratios", () => {
    expect(isAbsurdWalkingDetour(1027, 73)).toBe(true);
    expect(isAbsurdWalkingDetour(80, 73)).toBe(false);
    expect(isAbsurdWalkingDetour(800, 200)).toBe(true); // 4x > 3.5
    expect(isAbsurdWalkingDetour(600, 400)).toBe(false); // 1.5x
  });
});

describe("buildOsrmUrl", () => {
  it("uses FOSSGIS foot base and lng,lat order", () => {
    expect(OSRM_WALKING_URL).toContain("routing.openstreetmap.de/routed-foot");
    expect(OSRM_WALKING_URL).toMatch(/\/foot$/);
    expect(buildOsrmUrl(from, to)).toContain(
      "/135.5013,34.6687;135.5063,34.6525?",
    );
    expect(buildOsrmUrl(from, to)).toMatch(
      /^https:\/\/routing\.openstreetmap\.de\/routed-foot\/route\/v1\/foot\//,
    );
  });
});

describe("shouldRefetchForOriginMove", () => {
  it("refetches when origin is missing or moved far", () => {
    expect(shouldRefetchForOriginMove(null, from)).toBe(true);
    expect(shouldRefetchForOriginMove(from, from)).toBe(false);
    expect(
      shouldRefetchForOriginMove(from, { lat: from.lat + 0.001, lng: from.lng }),
    ).toBe(true);
  });
});

describe("formatWalkEta", () => {
  it("prefers duration seconds", () => {
    expect(formatWalkEta(125, 900)).toEqual({ minutes: 2, meters: 900 });
  });

  it("estimates from distance when no duration", () => {
    expect(formatWalkEta(null, 160)).toEqual({ minutes: 2, meters: 160 });
  });
});

describe("fetchWalkingRoute", () => {
  it("returns and caches an OSRM geometry", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        code: "Ok",
        routes: [
          {
            distance: 500,
            duration: 400,
            geometry: {
              coordinates: [
                [135.5013, 34.6687],
                [135.5063, 34.6525],
              ],
            },
          },
        ],
      }),
    );
    const first = await fetchWalkingRoute(from, to, { fetchImpl });
    expect(first.source).toBe("osrm");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const second = await fetchWalkingRoute(from, to, { fetchImpl });
    expect(second.source).toBe("osrm");
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(getCachedWalkingRoute(walkingRouteCacheKey(from, to))?.source).toBe(
      "osrm",
    );
  });

  it("falls back to straight when fetch fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    const result = await fetchWalkingRoute(from, to, { fetchImpl });
    expect(result.source).toBe("straight");
    expect(result.positions).toHaveLength(2);
  });

  it("forceStraight skips network", async () => {
    const fetchImpl = vi.fn();
    const result = await fetchWalkingRoute(from, to, {
      fetchImpl,
      forceStraight: true,
    });
    expect(result.source).toBe("straight");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("caches straight when OSRM returns an absurd detour", async () => {
    const near = { lat: 34.66865, lng: 135.5012 };
    const across = { lat: 34.6687, lng: 135.502 };
    const fetchImpl = vi.fn(async () =>
      Response.json({
        code: "Ok",
        routes: [
          {
            distance: 1027.3,
            duration: 123.7,
            geometry: {
              coordinates: [
                [135.500335, 34.668654],
                [135.501986, 34.669441],
              ],
            },
          },
        ],
      }),
    );
    const result = await fetchWalkingRoute(near, across, { fetchImpl });
    expect(result.source).toBe("straight");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const cached = await fetchWalkingRoute(near, across, { fetchImpl });
    expect(cached.source).toBe("straight");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
