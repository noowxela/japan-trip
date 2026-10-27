import { cityKanji } from "@/lib/city-kanji";

/** Sentinel for the “all cities” chip. */
export const ALL_CITIES_KEY = "__all__";

export type MapCarouselPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayId: string | null;
  /** 0-based trip day index (D1 = 0). */
  dayIndex: number;
  start: string | null;
  type: string | null;
  /** City from the place’s day (trip order). */
  city: string | null;
  mapsUrl: string | null;
  visited: boolean;
};

/** Stable key so Tokyo / 东京 / 東京 match. */
export function normalizeCityKey(city: string | null | undefined): string | null {
  if (!city) return null;
  const trimmed = city.trim();
  if (!trimmed) return null;
  const kanji = cityKanji(trimmed);
  if (kanji) return kanji;
  return trimmed.toLowerCase();
}

/** Unique cities in itinerary day order (skips empty). */
export function citiesInTripOrder(
  days: readonly { city: string | null }[],
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const day of days) {
    const raw = day.city?.trim();
    if (!raw) continue;
    const key = normalizeCityKey(raw) ?? raw;
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(raw);
  }
  return order;
}

/** Chip label: zh → kanji when known; en → romaji/as stored. */
export function cityChipLabel(
  city: string,
  locale: "zh" | "en",
): string {
  if (locale === "zh") {
    return cityKanji(city) ?? city;
  }
  const kanji = cityKanji(city);
  if (kanji) {
    // Prefer Latin spellings for known cities.
    const ROMAN: Record<string, string> = {
      東京: "Tokyo",
      京都: "Kyoto",
      大阪: "Osaka",
      奈良: "Nara",
    };
    if (ROMAN[kanji]) return ROMAN[kanji];
  }
  return city;
}

export function sortPinsByDayThenTime<T extends { dayIndex: number; start: string | null }>(
  pins: readonly T[],
): T[] {
  return [...pins].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return (a.start ?? "").localeCompare(b.start ?? "");
  });
}

/** `cityKey` null or ALL_CITIES_KEY → all pins; else match normalized city. */
export function filterPinsByCity<T extends { city: string | null }>(
  pins: readonly T[],
  cityKey: string | null,
): T[] {
  if (!cityKey || cityKey === ALL_CITIES_KEY) return [...pins];
  const want = normalizeCityKey(cityKey);
  if (!want) return [...pins];
  return pins.filter((pin) => normalizeCityKey(pin.city) === want);
}

export function carouselPinsForCity<T extends MapCarouselPin>(
  pins: readonly T[],
  cityKey: string | null,
): T[] {
  return sortPinsByDayThenTime(filterPinsByCity(pins, cityKey));
}
