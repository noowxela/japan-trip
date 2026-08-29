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
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (mapsUrl && /google\.[^/]+\/maps/i.test(mapsUrl)) {
    return mapsUrl;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}
