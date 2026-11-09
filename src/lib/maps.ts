import { isGoogleMapsUrl } from "@/lib/maps-url";

export function googleMapsHref({
  name,
  lat,
  lng,
  mapsUrl,
}: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
}) {
  const trimmed = mapsUrl?.trim();
  if (trimmed && isGoogleMapsUrl(trimmed)) {
    return trimmed;
  }
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

export function googleDirectionsHref({
  name,
  lat,
  lng,
}: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
}) {
  const destination =
    lat != null && lng != null
      ? `${lat},${lng}`
      : encodeURIComponent(name);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=transit`;
}

/**
 * Prefer handing off to the Google Maps *app* on iPhone (PWA / Safari).
 * Uses comgooglemapsurl:// so a stored Maps share/place URL opens in-app;
 * falls back to comgooglemaps://?q= when we only have coords/name.
 * Callers should keep {@link googleMapsHref} as the https fallback.
 */
export function googleMapsDeepLinkHref({
  name,
  lat,
  lng,
  mapsUrl,
}: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
}) {
  const web = googleMapsHref({ name, lat, lng, mapsUrl });
  if (/^https?:\/\//i.test(web)) {
    return `comgooglemapsurl://${web.replace(/^https?:\/\//i, "")}`;
  }
  if (lat != null && lng != null) {
    return `comgooglemaps://?q=${lat},${lng}`;
  }
  return `comgooglemaps://?q=${encodeURIComponent(name)}`;
}
