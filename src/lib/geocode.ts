export type PlaceSearchHit = {
  name: string;
  displayName: string;
  area: string;
  lat: number;
  lng: number;
  mapsUrl: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    town?: string;
    city?: string;
    village?: string;
  };
};

function mapsUrl(lat: number, lng: number) {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

function areaOf(hit: NominatimHit) {
  const address = hit.address ?? {};
  return (
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.city_district ||
    address.town ||
    address.village ||
    address.city ||
    ""
  );
}

export async function searchPlacesJapan(query: string, city?: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", [q, city, "Japan"].filter(Boolean).join(", "));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "jp");
  const response = await fetch(url, {
    headers: { "User-Agent": "japan-trip-app/1.0 (itinerary)" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const results = (await response.json()) as NominatimHit[];
  return results
    .map((hit) => {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
      const name = hit.name?.trim() || hit.display_name?.split(",")[0]?.trim() || q;
      return {
        name,
        displayName: hit.display_name ?? name,
        area: areaOf(hit),
        lat,
        lng,
        mapsUrl: mapsUrl(lat, lng),
      } satisfies PlaceSearchHit;
    })
    .filter((hit): hit is PlaceSearchHit => hit !== null);
}

export async function geocodeJapan(query: string) {
  const hits = await searchPlacesJapan(query);
  const first = hits[0];
  if (!first) return null;
  return { lat: first.lat, lng: first.lng };
}
