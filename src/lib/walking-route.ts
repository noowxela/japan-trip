/** Walking directions helpers for schedule day-map (OSRM foot + straight fallback). */

export type LatLng = { lat: number; lng: number };

export type WalkingRouteResult = {
  /** Leaflet positions: [lat, lng][] */
  positions: [number, number][];
  distanceMeters: number | null;
  durationSeconds: number | null;
  source: "osrm" | "straight";
};

/**
 * FOSSGIS routed-foot (real pedestrian graph). The public demo at
 * router.project-osrm.org only ships a car graph — its /walking and /foot
 * profiles return the same car routes and detour wildly for short Japan walks
 * (e.g. 73 m cross-street → ~1 km).
 */
export const OSRM_WALKING_URL =
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

/** Legacy car-graph demo — kept for tests / comparisons only. */
export const OSRM_DEMO_CAR_URL =
  "https://router.project-osrm.org/route/v1/walking";

/**
 * Reject OSRM geometry when route ≫ crow-flies (bad snap / car graph / ferry).
 * Short hops: also reject large absolute extras (cross-street car detours).
 */
export const MAX_DETOUR_RATIO = 3.5;
/** Below this crow distance, use absolute slack instead of ratio alone. */
export const SHORT_HOP_CROW_M = 120;
/** Max allowed (route − crow) for short hops. */
export const SHORT_HOP_EXTRA_M = 200;

/** ~45 m: ignore small GPS jitter before refetching. */
export const ORIGIN_REFETCH_METERS = 45;

/** Cache grid: 4 decimals ≈ 11 m. */
export const CACHE_COORD_DECIMALS = 4;

const EARTH_M = 6_371_000;

type CacheEntry = {
  result: WalkingRouteResult;
  at: number;
};

const memoryCache = new Map<string, CacheEntry>();
const MAX_MEMORY = 40;
const SESSION_PREFIX = "jt:walk:v2:";
const SESSION_TTL_MS = 1000 * 60 * 60 * 6;

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(from: LatLng, to: LatLng): number {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function quantizeCoord(
  value: number,
  decimals = CACHE_COORD_DECIMALS,
): number {
  if (!Number.isFinite(value)) return value;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function walkingRouteCacheKey(
  from: LatLng,
  to: LatLng,
  decimals = CACHE_COORD_DECIMALS,
): string {
  return [
    quantizeCoord(from.lat, decimals),
    quantizeCoord(from.lng, decimals),
    quantizeCoord(to.lat, decimals),
    quantizeCoord(to.lng, decimals),
  ].join("|");
}

export function straightLinePositions(
  from: LatLng,
  to: LatLng,
): [number, number][] {
  return [
    [from.lat, from.lng],
    [to.lat, to.lng],
  ];
}

export function straightWalkingRoute(from: LatLng, to: LatLng): WalkingRouteResult {
  const distanceMeters = haversineMeters(from, to);
  return {
    positions: straightLinePositions(from, to),
    distanceMeters,
    durationSeconds: null,
    source: "straight",
  };
}

/**
 * True when routed distance is absurd vs crow-flies (prefer straight instead).
 */
export function isAbsurdWalkingDetour(
  routeMeters: number,
  crowMeters: number,
  opts: {
    maxRatio?: number;
    shortHopCrowM?: number;
    shortHopExtraM?: number;
  } = {},
): boolean {
  if (!Number.isFinite(routeMeters) || !Number.isFinite(crowMeters)) return false;
  if (routeMeters <= 0) return false;
  const maxRatio = opts.maxRatio ?? MAX_DETOUR_RATIO;
  const shortCrow = opts.shortHopCrowM ?? SHORT_HOP_CROW_M;
  const shortExtra = opts.shortHopExtraM ?? SHORT_HOP_EXTRA_M;
  const crow = Math.max(0, crowMeters);
  if (crow < 1) return routeMeters > shortExtra;
  if (crow <= shortCrow) {
    return (
      routeMeters > crow * maxRatio || routeMeters - crow > shortExtra
    );
  }
  return routeMeters > crow * maxRatio;
}

/** OSRM GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng]. */
export function positionsFromOsrmLngLat(
  coords: readonly (readonly number[])[],
): [number, number][] {
  const out: [number, number][] = [];
  for (const pair of coords) {
    if (!pair || pair.length < 2) continue;
    const lng = pair[0];
    const lat = pair[1];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push([lat, lng]);
  }
  return out;
}

export function parseOsrmRouteResponse(
  json: unknown,
  fallbackFrom: LatLng,
  fallbackTo: LatLng,
): WalkingRouteResult {
  const fallback = straightWalkingRoute(fallbackFrom, fallbackTo);
  if (!json || typeof json !== "object") return fallback;
  const root = json as {
    code?: string;
    routes?: {
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: number[][] };
    }[];
  };
  if (root.code !== "Ok" || !Array.isArray(root.routes) || root.routes.length === 0) {
    return fallback;
  }
  const route = root.routes[0];
  const coords = route.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return fallback;
  const positions = positionsFromOsrmLngLat(coords);
  if (positions.length < 2) return fallback;
  const distanceMeters =
    typeof route.distance === "number" && Number.isFinite(route.distance)
      ? route.distance
      : fallback.distanceMeters ?? 0;
  const crow = fallback.distanceMeters ?? haversineMeters(fallbackFrom, fallbackTo);
  if (isAbsurdWalkingDetour(distanceMeters, crow)) {
    return fallback;
  }
  return {
    positions,
    distanceMeters,
    durationSeconds:
      typeof route.duration === "number" && Number.isFinite(route.duration)
        ? route.duration
        : null,
    source: "osrm",
  };
}

export function buildOsrmUrl(from: LatLng, to: LatLng, base = OSRM_WALKING_URL): string {
  const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  return `${base}/${path}?overview=full&geometries=geojson`;
}

function readSession(key: string): WalkingRouteResult | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; result?: WalkingRouteResult };
    if (!parsed?.result || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_PREFIX + key);
      return null;
    }
    if (
      !Array.isArray(parsed.result.positions) ||
      parsed.result.positions.length < 2
    ) {
      return null;
    }
    return parsed.result;
  } catch {
    return null;
  }
}

function writeSession(key: string, result: WalkingRouteResult) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      SESSION_PREFIX + key,
      JSON.stringify({ at: Date.now(), result }),
    );
  } catch {
    /* quota / private mode */
  }
}

function remember(key: string, result: WalkingRouteResult) {
  memoryCache.set(key, { result, at: Date.now() });
  while (memoryCache.size > MAX_MEMORY) {
    const oldest = memoryCache.keys().next().value;
    if (oldest == null) break;
    memoryCache.delete(oldest);
  }
  writeSession(key, result);
}

export function getCachedWalkingRoute(key: string): WalkingRouteResult | null {
  const mem = memoryCache.get(key);
  if (mem) return mem.result;
  const session = readSession(key);
  if (session) {
    memoryCache.set(key, { result: session, at: Date.now() });
    return session;
  }
  return null;
}

/** Test helper — clears in-memory + session entries for this module. */
export function clearWalkingRouteCache() {
  memoryCache.clear();
  if (typeof sessionStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SESSION_PREFIX)) keys.push(k);
    }
    for (const k of keys) sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export type FetchWalkingRouteOptions = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  /** Skip network and return straight line (offline / tests). */
  forceStraight?: boolean;
};

export async function fetchWalkingRoute(
  from: LatLng,
  to: LatLng,
  opts: FetchWalkingRouteOptions = {},
): Promise<WalkingRouteResult> {
  const key = walkingRouteCacheKey(from, to);
  const cached = getCachedWalkingRoute(key);
  if (cached) return cached;

  if (opts.forceStraight) {
    const straight = straightWalkingRoute(from, to);
    remember(key, straight);
    return straight;
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(buildOsrmUrl(from, to, opts.baseUrl), {
      signal: opts.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      // Transient HTTP errors: show straight now, retry later (no cache poison).
      return straightWalkingRoute(from, to);
    }
    const json: unknown = await res.json();
    const parsed = parseOsrmRouteResponse(json, from, to);
    // Cache OSRM and parsed straight (NoRoute / absurd detour) so remounts stay quiet.
    remember(key, parsed);
    return parsed;
  } catch {
    const straight = straightWalkingRoute(from, to);
    // Abort / offline blips: do not cache so a later online mount can retry OSRM.
    return straight;
  }
}

export function shouldRefetchForOriginMove(
  lastOrigin: LatLng | null | undefined,
  nextOrigin: LatLng,
  thresholdMeters = ORIGIN_REFETCH_METERS,
): boolean {
  if (!lastOrigin) return true;
  return haversineMeters(lastOrigin, nextOrigin) >= thresholdMeters;
}

export function formatWalkEta(
  durationSeconds: number | null | undefined,
  distanceMeters: number | null | undefined,
): { minutes: number | null; meters: number | null } {
  const minutes =
    durationSeconds != null && Number.isFinite(durationSeconds)
      ? Math.max(1, Math.round(durationSeconds / 60))
      : distanceMeters != null && Number.isFinite(distanceMeters)
        ? Math.max(1, Math.round(distanceMeters / 80))
        : null;
  const meters =
    distanceMeters != null && Number.isFinite(distanceMeters)
      ? Math.round(distanceMeters)
      : null;
  return { minutes, meters };
}
