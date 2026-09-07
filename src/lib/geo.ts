const EARTH_M = 6_371_000;
const WALK_M_PER_MIN = 80;
const MIN_WALK_M = 80;
const MAX_WALK_M = WALK_M_PER_MIN * 90;

type Coord = {
  lat?: number | null;
  lng?: number | null;
  kind?: string;
  chip?: string | null;
};

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatWalkMinutes(minutes: number) {
  if (minutes <= 0) return null;
  if (minutes === 1) return "~1 min walk";
  if (minutes < 60) return `~${minutes} min walk`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours}h walk`;
  return `~${hours}h ${mins}m walk`;
}

export function walkLabelBetween(from: Coord, to: Coord) {
  if (from.kind === "transit" && from.chip !== "Walk") return null;
  if (to.kind === "transit" && to.chip !== "Walk") return null;
  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
    return null;
  }
  const meters = haversineMeters(
    { lat: from.lat, lng: from.lng },
    { lat: to.lat, lng: to.lng },
  );
  if (meters < MIN_WALK_M || meters > MAX_WALK_M) return null;
  return formatWalkMinutes(Math.max(1, Math.round(meters / WALK_M_PER_MIN)));
}
