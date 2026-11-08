import type { Transit } from "@/lib/types";

/** Airline code + digits, e.g. MH88, JL12, CX710, AK123A. */
const FLIGHT_NUMBER_RE = /\b([A-Z]{2,3})\s?(\d{1,4}[A-Z]?)\b/i;

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
