export type PlaceSearchHit = {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  mapsUrl: string;
};

type NominatimHit = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
};

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

const LANDMARKS: { match: RegExp; lat: number; lng: number }[] = [
  { match: /土井活鰻|doi\s*katsu|doikatsuman/i, lat: 34.9679, lng: 135.7709 },
  { match: /oagari|おあがり|肉の隠れ家|volcano-?\s*steak/i, lat: 35.0037, lng: 135.7751 },
  { match: /fushimi\s*inari|伏見稲荷/i, lat: 34.96714, lng: 135.77268 },
  { match: /kiyomizu|清水寺/i, lat: 34.99486, lng: 135.78504 },
  { match: /ninen|sannen|二年坂|三年坂/i, lat: 34.99755, lng: 135.78072 },
  { match: /kodai-?ji|高台寺/i, lat: 35.00062, lng: 135.78141 },
  { match: /namba\s*yasaka|難波八阪/i, lat: 34.66148, lng: 135.49673 },
  { match: /nanaya|ななや/i, lat: 35.0084, lng: 135.7645 },
  { match: /idumoya|izumoya|いづもや/i, lat: 35.00403, lng: 135.77109 },
  { match: /sadakazu|さだかず/i, lat: 35.00422, lng: 135.77626 },
  { match: /sushiro|スシロー/i, lat: 35.0058, lng: 135.76853 },
  { match: /katsuda|かつだ|かつ田/i, lat: 35.0029, lng: 135.769 },
  { match: /kagizen|鍵善良房/i, lat: 35.00365, lng: 135.7745 },
  { match: /gokago/i, lat: 34.99554, lng: 135.78179 },
  { match: /katsuoji|勝尾寺/i, lat: 34.86583, lng: 135.49111 },
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
  { match: /todaiji|東大寺|东大寺/i, lat: 34.689, lng: 135.8398 },
  { match: /二月堂|nigatsu/i, lat: 34.6892, lng: 135.8436 },
  { match: /若草|wakakusa/i, lat: 34.6913, lng: 135.8556 },
  { match: /春日大社|kasugataisha|kasuga\s*taisha/i, lat: 34.6814, lng: 135.8485 },
  { match: /奈良公園|nara park/i, lat: 34.6851, lng: 135.843 },
  { match: /中谷堂|nakatanidou/i, lat: 34.6847, lng: 135.8275 },
  { match: /東向|东向|higashimuki/i, lat: 34.6845, lng: 135.8286 },
  { match: /kintetsu\s*nara|奈良站|奈良駅/i, lat: 34.6845, lng: 135.8278 },
  { match: /dotonbori|道顿掘|道頓堀|道顿堀/i, lat: 34.66903, lng: 135.50157 },
  { match: /kuromon|黒門/i, lat: 34.66371, lng: 135.50693 },
  { match: /tsutenkaku|通天閣/i, lat: 34.65254, lng: 135.50631 },
  { match: /namba|難波|南波/i, lat: 34.6628, lng: 135.5013 },
  { match: /水谷茶屋|mizuya/i, lat: 34.6817, lng: 135.8479 },
  { match: /平宗|hiraso/i, lat: 34.6779, lng: 135.8289 },
  { match: /麺闘庵|mentouan/i, lat: 34.6774, lng: 135.8305 },
  { match: /柿の専門|kaki no senmon/i, lat: 34.6776, lng: 135.8294 },
  { match: /kakinoha|柿の葉/i, lat: 34.6772, lng: 135.829 },
  { match: /tori\s*tamura|鶏田村/i, lat: 34.6849, lng: 135.8282 },
  { match: /yakiniku.*moku|焼肉工房|shinomiya/i, lat: 34.6947, lng: 135.8042 },
  { match: /edogawa|江戸川|shinsaibashi\s*parco/i, lat: 34.6751, lng: 135.5015 },
  { match: /ichiran/i, lat: 34.67429, lng: 135.50191 },
  { match: /nishiya|にし家/i, lat: 34.67373, lng: 135.5024 },
  { match: /dorajyu|どら十|鉄板酒場/i, lat: 34.67222, lng: 135.50237 },
  { match: /tokito|と木と/i, lat: 34.67307, lng: 135.51349 },
  { match: /harbs|daimaru\s*umeda|大丸梅田/i, lat: 34.70187, lng: 135.49626 },
  { match: /lucua|united\s*arrows/i, lat: 34.70188, lng: 135.49634 },
  { match: /kansai\s*international|関西国際/i, lat: 34.4342, lng: 135.2442 },
  { match: /王将|百万遍|hyakumanben/i, lat: 35.02958, lng: 135.77882 },
  { match: /m\s*stand|nanzenji\s*cafe/i, lat: 35.01155, lng: 135.78932 },
  { match: /blue\s*bottle/i, lat: 35.01139, lng: 135.78949 },
  { match: /yamatoan|大和庵|茶粥/i, lat: 34.6816, lng: 135.8212 },
  { match: /amadeo|あまでお/i, lat: 34.69742, lng: 135.49356 },
  { match: /klia|kuala\s*lumpur/i, lat: 2.74313, lng: 101.7064 },
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

export function coordsOfStay(stay: { name: string; address?: string }) {
  return (
    lookupLandmark(stay.name) ??
    (stay.address ? lookupLandmark(stay.address) : null)
  );
}

function cleanGeocodeQuery(query: string) {
  const latin = query
    .replace(/[\u3000-\u9fff]/g, " ")
    .replace(/[（）()&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return latin || query;
}

export async function searchPlacesJapan(query: string, city?: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", [q, city, "Japan"].filter(Boolean).join(", "));
  url.searchParams.set("format", "json");
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
