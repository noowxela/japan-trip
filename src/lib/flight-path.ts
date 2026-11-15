import { lookupLandmark } from "@/lib/geocode";
import type { AgendaItem, Transit } from "@/lib/types";

export type FlightRoute = {
  id: string;
  from: string;
  to: string;
};

export type FlightListLink = {
  fromId: string;
  toId: string;
};

export type LatLng = { lat: number; lng: number };

export type FlightMapArc = {
  id: string;
  from: LatLng;
  to: LatLng;
};

export type MapPinLike = LatLng & { id: string; name: string };

const GENERIC = new Set([
  "international",
  "airport",
  "airports",
  "station",
  "terminal",
  "the",
  "and",
  "via",
  "from",
  "机场",
  "空港",
  "国际",
  "國際",
]);

/** Airport words that show up as codes in Notion and as names on the map. */
const ALIASES: Record<string, string[]> = {
  kansai: ["kix", "关西", "関西"],
  kix: ["kansai", "关西", "関西"],
  klia: ["kul", "吉隆坡"],
  kul: ["klia"],
  nrt: ["narita", "成田"],
  narita: ["nrt"],
  hnd: ["haneda", "羽田"],
  haneda: ["hnd"],
  itm: ["itami", "伊丹"],
  itami: ["itm"],
};

const MIN_ARC_KM = 25;
const FLIGHT_MS = 7000;
const PAUSE_MS = 900;

export function flightRoutesFromTransit(transit: Transit[]): FlightRoute[] {
  return transit.flatMap((item) => {
    if (item.mode !== "Flight") return [];
    const from = item.from.trim();
    const to = item.to.trim();
    if (!from && !to) return [];
    return [{ id: item.id, from, to }];
  });
}

export function endpointTokens(value: string): string[] {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !GENERIC.has(token));
}

/** Last distinctive word, plus airport-code aliases (KIX ↔ Kansai). */
export function primaryEndpointTokens(value: string): string[] {
  const parts = endpointTokens(value);
  if (parts.length === 0) return [];
  const primary = parts[parts.length - 1];
  return [primary, ...(ALIASES[primary] ?? [])];
}

export function nameMatchesEndpoint(name: string, endpoint: string): boolean {
  const wanted = primaryEndpointTokens(endpoint);
  if (wanted.length === 0) return false;
  const blob = name.normalize("NFKC").toLowerCase();
  return wanted.some((token) => blob.includes(token));
}

function flightEndpoints(item: AgendaItem): { from: string; to: string } | null {
  if (item.kind !== "transit" || item.chip !== "Flight") return null;
  const halves = item.detail.split("→").map((part) => part.trim());
  const from = item.from?.trim() || halves[0] || "";
  const to = item.to?.trim() || halves[1] || "";
  if (!to) return null;
  return { from, to };
}

function findArrival(agenda: AgendaItem[], index: number, to: string) {
  const later = agenda.slice(index + 1);
  const laterPlace = later.find(
    (item) => item.kind === "place" && nameMatchesEndpoint(item.name, to),
  );
  if (laterPlace) return laterPlace;

  const laterFlight = later.find((item) => {
    const ends = flightEndpoints(item);
    if (!ends) return false;
    return nameMatchesEndpoint(ends.from, to) || nameMatchesEndpoint(item.name, to);
  });
  if (laterFlight) return laterFlight;

  for (let i = index - 1; i >= 0; i--) {
    const item = agenda[i];
    if (item.kind === "place" && nameMatchesEndpoint(item.name, to)) return item;
  }
  return null;
}

/** Flight row → its arrival place (or the next flight segment) on one day list. */
export function flightListLinks(agenda: AgendaItem[]): FlightListLink[] {
  const links: FlightListLink[] = [];
  for (let i = 0; i < agenda.length; i++) {
    const ends = flightEndpoints(agenda[i]);
    if (!ends) continue;
    const arrival = findArrival(agenda, i, ends.to);
    if (!arrival || arrival.id === agenda[i].id) continue;
    links.push({ fromId: agenda[i].id, toId: arrival.id });
  }
  return links;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function arcControl(x: number, y1: number, y2: number) {
  const span = Math.abs(y2 - y1);
  const bulge = Math.min(16, Math.max(8, span * 0.045));
  return { cx: Math.max(6, x - bulge), cy: (y1 + y2) / 2 };
}

/** Soft arc in the schedule gutter. Coordinates are pixels, y grows downward. */
export function flightArcPath(x: number, y1: number, y2: number) {
  const { cx, cy } = arcControl(x, y1, y2);
  return `M ${round1(x)} ${round1(y1)} Q ${round1(cx)} ${round1(cy)} ${round1(x)} ${round1(y2)}`;
}

export function flightArcPose(x: number, y1: number, y2: number, t: number) {
  const clamped = Math.min(1, Math.max(0, t));
  const { cx, cy } = arcControl(x, y1, y2);
  const mt = 1 - clamped;
  const px = mt * mt * x + 2 * mt * clamped * cx + clamped * clamped * x;
  const py = mt * mt * y1 + 2 * mt * clamped * cy + clamped * clamped * y2;
  const dx = 2 * mt * (cx - x) + 2 * clamped * (x - cx);
  const dy = 2 * mt * (cy - y1) + 2 * clamped * (y2 - cy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x: px, y: py, angle };
}

function distanceKm(a: LatLng, b: LatLng) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function landmarkCoord(endpoint: string): LatLng | null {
  const direct = lookupLandmark(endpoint);
  if (direct) return { lat: direct.lat, lng: direct.lng };
  for (const token of primaryEndpointTokens(endpoint)) {
    const hit = lookupLandmark(token) ?? lookupLandmark(`${token} international`);
    if (hit) return { lat: hit.lat, lng: hit.lng };
  }
  return null;
}

function coordForEndpoint(
  endpoint: string,
  pins: MapPinLike[],
  hiddenIds: ReadonlySet<string>,
): LatLng | null {
  const matches = pins.filter((pin) => nameMatchesEndpoint(pin.name, endpoint));
  if (matches.length > 0) {
    const visible = matches.filter((pin) => !hiddenIds.has(pin.id));
    if (visible.length === 0) return null;
    const best = visible.slice().sort((a, b) => a.name.length - b.name.length)[0];
    return { lat: best.lat, lng: best.lng };
  }
  return landmarkCoord(endpoint);
}

/**
 * One arc per flight. Visible pins win; a hidden matched pin suppresses the
 * landmark fallback so a dismissed airport does not keep flying.
 */
export function flightMapArcs(
  routes: FlightRoute[],
  pins: MapPinLike[],
  hiddenIds: ReadonlySet<string> = new Set(),
): FlightMapArc[] {
  const arcs: FlightMapArc[] = [];
  for (const route of routes) {
    if (!route.from.trim() || !route.to.trim()) continue;
    const from = coordForEndpoint(route.from, pins, hiddenIds);
    const to = coordForEndpoint(route.to, pins, hiddenIds);
    if (!from || !to) continue;
    if (distanceKm(from, to) < MIN_ARC_KM) continue;
    arcs.push({ id: route.id, from, to });
  }
  return arcs;
}

type Vec = [number, number, number];

function toVec(point: LatLng): Vec {
  const lat = (point.lat * Math.PI) / 180;
  const lng = (point.lng * Math.PI) / 180;
  const cos = Math.cos(lat);
  return [cos * Math.cos(lng), cos * Math.sin(lng), Math.sin(lat)];
}

function fromVec(vec: Vec): LatLng {
  return {
    lat: (Math.atan2(vec[2], Math.hypot(vec[0], vec[1])) * 180) / Math.PI,
    lng: (Math.atan2(vec[1], vec[0]) * 180) / Math.PI,
  };
}

function cross(a: Vec, b: Vec): Vec {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(vec: Vec): Vec {
  const length = Math.hypot(vec[0], vec[1], vec[2]) || 1;
  return [vec[0] / length, vec[1] / length, vec[2] / length];
}

/** Great-circle samples with a small bow so short hops still read as a flight. */
export function greatCircle(from: LatLng, to: LatLng, steps = 64): LatLng[] {
  const start = toVec(from);
  const end = toVec(to);
  const dot = Math.min(1, Math.max(-1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]));
  const omega = Math.acos(dot);
  const side = normalize(cross(start, end));
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (omega < 1e-4) {
      points.push(from);
      continue;
    }
    const sin = Math.sin(omega);
    const a = Math.sin((1 - t) * omega) / sin;
    const b = Math.sin(t * omega) / sin;
    const base: Vec = [
      start[0] * a + end[0] * b,
      start[1] * a + end[1] * b,
      start[2] * a + end[2] * b,
    ];
    const lift = Math.sin(Math.PI * t) * Math.min(0.18, omega * 0.22);
    points.push(
      fromVec(
        normalize([
          base[0] + side[0] * lift,
          base[1] + side[1] * lift,
          base[2] + side[2] * lift,
        ]),
      ),
    );
  }
  points[0] = from;
  points[points.length - 1] = to;
  return points;
}

/** 0→1 along the leg, then a short hold at the arrival before the loop restarts. */
export function flightLoopProgress(
  elapsedMs: number,
  flightMs = FLIGHT_MS,
  pauseMs = PAUSE_MS,
) {
  const cycle = flightMs + pauseMs;
  const t = ((elapsedMs % cycle) + cycle) % cycle;
  if (t >= flightMs) return 1;
  const u = t / flightMs;
  return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
}

/**
 * Index range of a projected route that intersects the map viewport.
 * One sample outside the box is kept so the plane can enter from the edge.
 */
export function visibleSampleRange(
  points: { x: number; y: number }[],
  width: number,
  height: number,
  margin = 0,
): { start: number; end: number } | null {
  if (points.length < 2 || width <= 0 || height <= 0) return null;
  let start = -1;
  let end = -1;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const inside =
      point.x >= margin &&
      point.y >= margin &&
      point.x <= width - margin &&
      point.y <= height - margin;
    if (!inside) continue;
    if (start < 0) start = i;
    end = i;
  }
  if (start < 0 || end < 0) return null;
  if (start > 0) start -= 1;
  if (end < points.length - 1) end += 1;
  if (end <= start) return null;
  const a = points[start];
  const b = points[end];
  if (Math.hypot(b.x - a.x, b.y - a.y) < 16) return null;
  return { start, end };
}
