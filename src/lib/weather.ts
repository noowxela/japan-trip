import { dateKey } from "@/lib/format";
import { CITY_COORDS, type TripDay } from "@/lib/types";

function plusDays(day: string, days: number): string | null {
  const ms = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

export type DayWeather = {
  code: number;
  tMax: number;
  tMin: number;
  rainPct: number | null;
};

/** Forecast per trip date (YYYY-MM-DD, Asia/Tokyo), for that day's city. */
export type TripWeather = Record<string, DayWeather>;

export type WeatherKind =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

/** Open-Meteo forecast horizon (today + 15). */
export const FORECAST_DAYS = 16;
export const RAINY_PCT = 50;
export const SHOW_RAIN_PCT = 20;

const GLYPH: Record<WeatherKind, string> = {
  clear: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
};

/** WMO weather interpretation code → coarse kind. */
export function weatherKind(code: number): WeatherKind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export function weatherGlyph(code: number): string {
  return GLYPH[weatherKind(code)];
}

export function isRainy(weather: DayWeather | null | undefined): boolean {
  return weather?.rainPct != null && weather.rainPct >= RAINY_PCT;
}

export function tempRange(weather: DayWeather): string {
  return `${Math.round(weather.tMin)}–${Math.round(weather.tMax)}°`;
}

/** Compact header text, e.g. `🌧️ 12–17° 80%` (rain % only when ≥ 20). */
export function weatherShort(weather: DayWeather): string {
  const rain =
    weather.rainPct != null && weather.rainPct >= SHOW_RAIN_PCT
      ? ` ${weather.rainPct}%`
      : "";
  return `${weatherGlyph(weather.code)} ${tempRange(weather)}${rain}`;
}

export type ForecastRequest = {
  city: string;
  lat: number;
  lng: number;
  start: string;
  end: string;
  dates: string[];
};

/** One request per city covering its trip dates inside the forecast window. */
export function forecastRequests(days: TripDay[], today: string): ForecastRequest[] {
  const last = plusDays(today, FORECAST_DAYS - 1);
  if (!last) return [];
  const byCity = new Map<string, string[]>();
  for (const day of days) {
    const date = dateKey(day.date);
    if (!date || !day.city || !CITY_COORDS[day.city]) continue;
    if (date < today || date > last) continue;
    const list = byCity.get(day.city) ?? [];
    if (!list.includes(date)) list.push(date);
    byCity.set(day.city, list);
  }
  return [...byCity.entries()].map(([city, dates]) => {
    const sorted = dates.sort();
    const [lat, lng] = CITY_COORDS[city]!;
    return {
      city,
      lat,
      lng,
      start: sorted[0]!,
      end: sorted[sorted.length - 1]!,
      dates: sorted,
    };
  });
}

type OpenMeteoDaily = {
  daily?: {
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
  };
};

/** Parse an Open-Meteo daily response, keeping only `dates`. */
export function parseOpenMeteo(json: unknown, dates: string[]): TripWeather {
  const daily = (json as OpenMeteoDaily | null)?.daily;
  const out: TripWeather = {};
  if (!daily?.time) return out;
  const wanted = new Set(dates);
  daily.time.forEach((date, index) => {
    if (!wanted.has(date)) return;
    const code = daily.weather_code?.[index];
    const tMax = daily.temperature_2m_max?.[index];
    const tMin = daily.temperature_2m_min?.[index];
    if (code == null || tMax == null || tMin == null) return;
    const rain = daily.precipitation_probability_max?.[index];
    out[date] = { code, tMax, tMin, rainPct: rain ?? null };
  });
  return out;
}

function forecastUrl(request: ForecastRequest): string {
  const params = new URLSearchParams({
    latitude: String(request.lat),
    longitude: String(request.lng),
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Tokyo",
    start_date: request.start,
    end_date: request.end,
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

async function fetchCity(request: ForecastRequest): Promise<TripWeather> {
  try {
    const res = await fetch(forecastUrl(request), {
      next: { revalidate: 10800 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return {};
    return parseOpenMeteo(await res.json(), request.dates);
  } catch {
    return {};
  }
}

/** Forecast for trip days within 16 days. Never throws; `{}` when unavailable. */
export async function getTripWeather(
  days: TripDay[],
  now = new Date(),
): Promise<TripWeather> {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  const requests = forecastRequests(days, today);
  if (requests.length === 0) return {};
  const parts = await Promise.all(requests.map(fetchCity));
  return Object.assign({}, ...parts) as TripWeather;
}
