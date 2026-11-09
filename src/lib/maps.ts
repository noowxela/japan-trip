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
