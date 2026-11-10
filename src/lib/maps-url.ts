/** Detect and parse Google Maps share / place / search URLs (no network). */

export type ParsedMapsLocation = {
  lat: number | null;
  lng: number | null;
  name: string | null;
};

const COORD = "(-?\\d+(?:\\.\\d+)?)";
const COORD_PAIR = new RegExp(`^${COORD}\\s*,\\s*${COORD}$`);
const AT_COORDS = new RegExp(`@${COORD},${COORD}`);
const PIN_COORDS = new RegExp(`(?:^|[!/?&])3d${COORD}[!/]4d${COORD}`, "g");

function asCoord(latRaw: string, lngRaw: string): { lat: number; lng: number } | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function pairFromText(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(COORD_PAIR);
  return match ? asCoord(match[1], match[2]) : null;
}

function decodeLoose(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function looksLikeCoordName(value: string) {
  return COORD_PAIR.test(value.trim());
}

export function isGoogleMapsUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "maps.app.goo.gl" ||
    host === "goo.gl" ||
    host === "g.co" ||
    host === "maps.google.com" ||
    host.startsWith("maps.google.")
  ) {
    return true;
  }
  if (host === "google.com" || host.endsWith(".google.com") || /\.google\.[a-z.]+$/i.test(host)) {
    return url.pathname.includes("/maps");
  }
  return false;
}

function stripTrailingPunct(value: string) {
  return value.replace(/[.,;:!?。、，)\]】》」』]+$/g, "");
}

function withHttps(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function unwrapGoogleRedirect(raw: string) {
  try {
    const url = new URL(raw);
    if (
      (url.hostname === "google.com" || url.hostname.endsWith(".google.com")) &&
      url.pathname === "/url"
    ) {
      const target = url.searchParams.get("q") || url.searchParams.get("url");
      if (target) return target;
    }
  } catch {
    // Keep the original string.
  }
  return raw;
}

const URL_IN_TEXT = /https?:\/\/[^\s<>"'）】》」』]+/gi;
const BARE_MAPS_URL =
  /(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/maps|maps\.google\.[a-z.]+|(?:www\.)?google\.[a-z.]+\/maps)\/[^\s<>"'）】》」』]+/gi;

/**
 * Pull a Google Maps URL out of a paste that may include a place name,
 * a missing https://, trailing punctuation, or a google.com/url wrapper.
 */
export function extractGoogleMapsUrl(input: string): string | null {
  const raw = input.trim().replace(/\u00a0/g, " ");
  if (!raw) return null;

  const asMapsUrl = (value: string) => {
    const cleaned = stripTrailingPunct(unwrapGoogleRedirect(withHttps(value.trim())));
    return isGoogleMapsUrl(cleaned) ? cleaned : null;
  };

  const direct = asMapsUrl(raw);
  if (direct) return direct;

  const candidates: string[] = [];
  for (const match of raw.matchAll(URL_IN_TEXT)) candidates.push(match[0]);
  for (const match of raw.matchAll(BARE_MAPS_URL)) candidates.push(match[0]);
  for (const candidate of candidates) {
    const found = asMapsUrl(candidate);
    if (found) return found;
  }
  return null;
}

export function parseGoogleMapsLocation(input: string): ParsedMapsLocation {
  const raw = input.trim();
  const decoded = decodeLoose(raw);
  let name: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;

  const pins = [...decoded.matchAll(PIN_COORDS)];
  const pin = pins.at(-1);
  if (pin) {
    const coords = asCoord(pin[1], pin[2]);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  try {
    const url = new URL(raw);
    const query =
      url.searchParams.get("q") ||
      url.searchParams.get("query") ||
      url.searchParams.get("ll") ||
      url.searchParams.get("destination");
    const fromQuery = pairFromText(query);
    if (lat == null && fromQuery) {
      lat = fromQuery.lat;
      lng = fromQuery.lng;
    } else if (query && !fromQuery) {
      const label = decodeLoose(query.replace(/\+/g, " ")).trim();
      if (label && !looksLikeCoordName(label)) name = label;
    }

    const place = url.pathname.match(/\/place\/([^/]+)/);
    if (place) {
      const label = decodeLoose(place[1].replace(/\+/g, " ")).trim();
      if (label && !looksLikeCoordName(label) && !label.startsWith("@")) {
        name = label;
      }
    }
  } catch {
    // Not a parseable URL; still try @ / !3d patterns on the raw string.
  }

  if (lat == null) {
    const at = decoded.match(AT_COORDS);
    if (at) {
      const coords = asCoord(at[1], at[2]);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }
  }

  return { lat, lng, name };
}

export function mapsSearchUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
