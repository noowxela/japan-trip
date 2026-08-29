export type TripDay = {
  id: string;
  name: string;
  date: string | null;
  city: string | null;
  status: string | null;
};

export type Place = {
  id: string;
  name: string;
  type: string | null;
  area: string;
  mapsUrl: string | null;
  notes: string;
  visited: boolean;
  dayIds: string[];
  start: string | null;
  order: number | null;
  lat: number | null;
  lng: number | null;
};

export type Stay = {
  id: string;
  name: string;
  checkIn: string | null;
  checkOut: string | null;
  address: string;
  bookingUrl: string | null;
  confirmation: string;
};

export type Transit = {
  id: string;
  name: string;
  mode: string | null;
  from: string;
  to: string;
  date: string | null;
  bookingUrl: string | null;
  dayIds: string[];
  start: string | null;
  order: number | null;
};

export const SPEND_CURRENCIES = ["Yen", "RM"] as const;
export type SpendCurrency = (typeof SPEND_CURRENCIES)[number];
export const DEFAULT_SPEND_CURRENCY: SpendCurrency = "RM";
export const JPY_PER_RM = 39.3;

export type SpendItem = {
  id: string;
  name: string;
  amount: number;
  currency: SpendCurrency;
  kind: string | null;
  category: string | null;
  notes: string;
  dayIds: string[];
};

export type AgendaItem = {
  id: string;
  kind: "place" | "transit";
  name: string;
  chip: string | null;
  detail: string;
  start: string | null;
  order: number | null;
  visited?: boolean;
  mapsUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export const CITIES = ["Tokyo", "Kyoto", "Osaka", "Other"] as const;
export const PLACE_TYPES = ["Sight", "Food", "Shop", "Cafe", "Other"] as const;
export const TRANSIT_MODES = [
  "Shinkansen",
  "Metro",
  "Bus",
  "Flight",
  "Walk",
] as const;
export const SPEND_KINDS = ["Estimate", "Actual"] as const;
export const SPEND_CATEGORIES = [
  "Food",
  "Transit",
  "Stay",
  "Ticket",
  "Shop",
  "Other",
] as const;

export const CITY_COORDS: Record<string, [number, number]> = {
  Tokyo: [35.6812, 139.7671],
  Kyoto: [35.0116, 135.7681],
  Osaka: [34.6937, 135.5023],
};
