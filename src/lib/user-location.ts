/** Browser geolocation helpers for schedule / day maps. */

export type UserLocationFix = {
  lat: number;
  lng: number;
  /** Horizontal accuracy in meters when known. */
  accuracy: number | null;
};

export type UserLocationStatus =
  | "pending"
  | "ready"
  | "denied"
  | "unavailable";

export const USER_LOCATION_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 8_000,
  timeout: 20_000,
};

export const LOCATE_ME_ZOOM = 16;

/** Prefer a readable accuracy ring; clamp wild GPS jumps. */
export function accuracyRadiusMeters(accuracy: number | null | undefined): number | null {
  if (accuracy == null || !Number.isFinite(accuracy) || accuracy <= 0) return null;
  return Math.min(Math.max(accuracy, 12), 250);
}

export function userLocationFromCoords(coords: {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}): UserLocationFix | null {
  const lat = coords.latitude;
  const lng = coords.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracy =
    coords.accuracy != null && Number.isFinite(coords.accuracy) && coords.accuracy > 0
      ? coords.accuracy
      : null;
  return { lat, lng, accuracy };
}

export function geolocationErrorKind(
  error: { code: number } | null | undefined,
): Exclude<UserLocationStatus, "pending" | "ready"> {
  // 1 = PERMISSION_DENIED in the Geolocation API
  if (error && error.code === 1) return "denied";
  return "unavailable";
}

export function isGeolocationAvailable(
  geo: Geolocation | null | undefined = typeof navigator !== "undefined"
    ? navigator.geolocation
    : null,
): boolean {
  return Boolean(geo && typeof geo.watchPosition === "function");
}
