import type { Transit } from "@/lib/types";

/**
 * IATA flight number: 2-char airline (MH, JL, D7, 3K, U2) + 1–4 digit flight.
 * e.g. MH88, JL12, D7532 (AirAsia X), CX710.
 */
const FLIGHT_NUMBER_RE =
  /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s?(\d{1,4}[A-Z]?)\b/i;

export function extractFlightNumber(name: string | null | undefined): string | null {
  if (!name) return null;
  const match = name.trim().match(FLIGHT_NUMBER_RE);
  if (!match) return null;
  return `${match[1]!.toUpperCase()}${match[2]!.toUpperCase()}`;
}

export type FlightLookupInput = Pick<Transit, "name" | "from" | "to" | "date">;

/**
 * External lookup URL for a transit Flight row.
 * Prefer FlightAware when a flight number is present; otherwise Google Flights search.
 */
export function flightExternalHref(flight: FlightLookupInput): string {
  const number = extractFlightNumber(flight.name);
  if (number) {
    return `https://www.flightaware.com/live/flight/${encodeURIComponent(number)}`;
  }

  const bits = [
    "flights",
    flight.name?.trim() || null,
    flight.from?.trim() || null,
    flight.from && flight.to ? "to" : null,
    flight.to?.trim() || null,
    flight.date ? flight.date.slice(0, 10) : null,
  ].filter(Boolean);
  const q = bits.join(" ") || "flights";
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export type FlightLookupResult = {
  number: string;
  airline: string | null;
  fromIata: string | null;
  toIata: string | null;
  fromName: string | null;
  toName: string | null;
  /** YYYY-MM-DD in Asia/Tokyo from scheduled departure. */
  date: string | null;
  /** HH:mm in Asia/Tokyo from scheduled departure. */
  time: string | null;
  status: string | null;
  trackUrl: string;
  searchUrl: string;
  source: "flightradar24";
};

function tokyoDateAndTime(unixSec: number | null | undefined): {
  date: string | null;
  time: string | null;
} {
  if (unixSec == null || !Number.isFinite(unixSec)) {
    return { date: null, time: null };
  }
  const d = new Date(unixSec * 1000);
  const date = d.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { date, time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` };
}

type Fr24ListRow = {
  identification?: { number?: { default?: string | null } | null } | null;
  status?: { text?: string | null } | null;
  airline?: { name?: string | null; code?: { iata?: string | null } | null } | null;
  airport?: {
    origin?: {
      name?: string | null;
      code?: { iata?: string | null } | null;
    } | null;
    destination?: {
      name?: string | null;
      code?: { iata?: string | null } | null;
    } | null;
  } | null;
  time?: {
    scheduled?: {
      departure?: number | null;
      arrival?: number | null;
    } | null;
  } | null;
};

type Fr24SearchHit = {
  id?: string;
  label?: string;
  detail?: { operator?: string; flight?: string; callsign?: string } | null;
  type?: string;
};

/** Known IATA/ICAO operator → display airline (FR24 search often only gives codes). */
const OPERATOR_AIRLINE: Record<string, string> = {
  AXM: "AirAsia",
  XAX: "AirAsia X",
  MAS: "Malaysia Airlines",
  JAL: "Japan Airlines",
  ANA: "All Nippon Airways",
  JJP: "Jetstar Japan",
  APJ: "Peach",
  SJX: "Starflyer",
};

/**
 * Free lookup via Flightradar24 public JSON (no API key).
 * Verified for AirAsia X D7532 → KUL–KIX. May break if FR24 changes endpoints.
 */
export async function lookupFlightByNumber(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FlightLookupResult | null> {
  const number =
    extractFlightNumber(raw) ??
    extractFlightNumber(raw.trim().toUpperCase().replace(/\s+/g, ""));
  if (!number) return null;

  const headers = {
    Accept: "application/json",
    "User-Agent": "japan-trip-app/flight-lookup",
  };

  const listUrl = `https://api.flightradar24.com/common/v1/flight/list.json?query=${encodeURIComponent(number)}&fetchBy=flight&limit=5`;
  const searchUrl = `https://www.flightradar24.com/v1/search/web/find?query=${encodeURIComponent(number)}&limit=5`;

  const [listRes, searchRes] = await Promise.all([
    fetchImpl(listUrl, { headers, next: { revalidate: 0 } as RequestInit["next"] }).catch(
      () => null,
    ),
    fetchImpl(searchUrl, { headers, next: { revalidate: 0 } as RequestInit["next"] }).catch(
      () => null,
    ),
  ]);

  let airline: string | null = null;
  if (searchRes?.ok) {
    const searchJson = (await searchRes.json()) as { results?: Fr24SearchHit[] };
    const hit =
      searchJson.results?.find((row) => row.type === "schedule" || row.id === number) ??
      searchJson.results?.[0];
    const callsign = hit?.detail?.callsign?.toUpperCase() ?? "";
    const op = hit?.detail?.operator?.toUpperCase();
    if (callsign.startsWith("XAX")) airline = "AirAsia X";
    else if (op && OPERATOR_AIRLINE[op]) airline = OPERATOR_AIRLINE[op];
    else if (hit?.label?.includes("(")) {
      const m = hit.label.match(/\(([^)]+)\)/);
      if (m) airline = m[1]!.trim();
    }
  }

  if (!listRes?.ok) {
    if (!airline) return null;
    return {
      number,
      airline,
      fromIata: null,
      toIata: null,
      fromName: null,
      toName: null,
      date: null,
      time: null,
      status: null,
      trackUrl: `https://www.flightaware.com/live/flight/${encodeURIComponent(number)}`,
      searchUrl: `https://www.google.com/travel/flights?q=${encodeURIComponent(number)}`,
      source: "flightradar24",
    };
  }

  const listJson = (await listRes.json()) as {
    result?: { response?: { data?: Fr24ListRow[] } };
  };
  const rows = listJson.result?.response?.data ?? [];
  const row =
    rows.find((entry) => entry.airport?.origin?.code?.iata && entry.airport?.destination?.code?.iata) ??
    rows[0];
  if (!row) {
    return airline
      ? {
          number,
          airline,
          fromIata: null,
          toIata: null,
          fromName: null,
          toName: null,
          date: null,
          time: null,
          status: null,
          trackUrl: `https://www.flightaware.com/live/flight/${encodeURIComponent(number)}`,
          searchUrl: `https://www.google.com/travel/flights?q=${encodeURIComponent(number)}`,
          source: "flightradar24",
        }
      : null;
  }

  const fromIata = row.airport?.origin?.code?.iata ?? null;
  const toIata = row.airport?.destination?.code?.iata ?? null;
  const { date, time } = tokyoDateAndTime(row.time?.scheduled?.departure ?? null);
  if (!airline && row.airline?.name) airline = row.airline.name;

  return {
    number,
    airline,
    fromIata,
    toIata,
    fromName: row.airport?.origin?.name ?? null,
    toName: row.airport?.destination?.name ?? null,
    date,
    time,
    status: row.status?.text ?? null,
    trackUrl: `https://www.flightaware.com/live/flight/${encodeURIComponent(number)}`,
    searchUrl: `https://www.google.com/travel/flights?q=${encodeURIComponent(
      [number, fromIata, toIata].filter(Boolean).join(" "),
    )}`,
    source: "flightradar24",
  };
}

/** Suggested transit name: "AirAsia X D7532" or just the number. */
export function suggestedFlightName(result: FlightLookupResult): string {
  if (result.airline) return `${result.airline} ${result.number}`;
  return result.number;
}
