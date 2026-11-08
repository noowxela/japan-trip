import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOsrmUrl,
  clearWalkingRouteCache,
  fetchWalkingRoute,
  formatWalkEta,
  getCachedWalkingRoute,
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
});

describe("buildOsrmUrl", () => {
  it("uses lng,lat order", () => {
    expect(buildOsrmUrl(from, to)).toContain(
      "/135.5013,34.6687;135.5063,34.6525?",
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
});
