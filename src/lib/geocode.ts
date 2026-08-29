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

const LANDMARKS: { match: RegExp; lat: number; lng: number }[] = [
  { match: /fushimi\s*inari|伏見稲荷/i, lat: 34.96714, lng: 135.77268 },
  { match: /kiyomizu|清水寺/i, lat: 34.99486, lng: 135.78504 },
  { match: /ninen|sannen|二年坂|三年坂/i, lat: 34.99755, lng: 135.78072 },
  { match: /kodai-?ji|高台寺/i, lat: 35.00062, lng: 135.78141 },
  { match: /yasaka|八坂/i, lat: 35.00365, lng: 135.77856 },
  { match: /nishiki|錦市場|锦市场/i, lat: 35.00505, lng: 135.76497 },
  { match: /gion|祇園/i, lat: 35.00361, lng: 135.775 },
  { match: /kamo\s*river|鴨川|鸭川/i, lat: 35.0137, lng: 135.7716 },
  { match: /kyoto\s*station|京都駅|京都站/i, lat: 34.98585, lng: 135.75877 },
  {
    match: /back hotel|mitsui garden|kyoto shijo|京都四条/i,
    lat: 35.00288,
    lng: 135.76155,
  },
];

export function lookupLandmark(name: string) {
  const hit = LANDMARKS.find((item) => item.match.test(name));
  if (!hit) return null;
  return { lat: hit.lat, lng: hit.lng, mapsUrl: mapsUrl(hit.lat, hit.lng) };
}

export function coordsOfPlace(place: {
  name: string;
  lat?: number | null;
  lng?: number | null;
}) {
  if (place.lat != null && place.lng != null) {
    return { lat: place.lat, lng: place.lng };
  }
  const known = lookupLandmark(place.name);
  return known ? { lat: known.lat, lng: known.lng } : null;
}

function cleanGeocodeQuery(query: string) {
  const latin = query
    .replace(/[\u3000-\u9fff]/g, " ")
    .replace(/[（）()&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return latin || query;
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

export async function geocodeJapan(query: string, city?: string) {
  const known = lookupLandmark(query);
  if (known) return { lat: known.lat, lng: known.lng, mapsUrl: known.mapsUrl };
  const hits = await searchPlacesJapan(cleanGeocodeQuery(query), city);
  const first = hits[0];
  if (!first) return null;
  return { lat: first.lat, lng: first.lng, mapsUrl: first.mapsUrl };
}
