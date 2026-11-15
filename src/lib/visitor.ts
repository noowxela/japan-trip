import { isKvConfigured, redisCommand } from "@/lib/kv";
import type { Locale } from "@/lib/i18n/dictionaries";

export const VISITOR_COOKIE = "trip_visitor";
export const VISITOR_MAX_AGE_SEC = 365 * 24 * 60 * 60;
export const MAX_VISITORS = 500;
export const MAX_PATHS = 20;
export const VISITOR_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const VISIT_DEBOUNCE_MS = 5_000;

const STORE_KEY = "japan-trip:visitors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BOT_RE =
  /(?:googlebot|bingbot|baiduspider|yandex(?:bot|images)|duckduckbot|slurp|facebookexternalhit|facebot|twitterbot|linkedinbot|applebot|pingdom|uptimerobot|vercel-screenshot|vercel-favicon|headlesschrome|phantomjs|crawler|spider)/i;

const STATIC_PATH_RE =
  /\.(?:svg|png|jpe?g|gif|webp|ico|css|js|map|txt|woff2?|webmanifest)$/i;

const SKIP_PATH_RE =
  /^\/(?:api\/|_next\/|serwist\/|favicon\.ico$|icon(?:\.png)?$|apple-icon|opengraph-image|twitter-image|manifest\.webmanifest$)/;

export type VisitorGeo = {
  city: string | null;
  country: string | null;
  region: string | null;
};

export type ParsedUa = {
  device: string | null;
  os: string | null;
  browser: string | null;
};

export type VisitorRecord = {
  id: string;
  firstSeen: string;
  lastSeen: string;
  visitCount: number;
  lastIp: string | null;
  geo: VisitorGeo | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  language: string | null;
  referer: string | null;
  paths: string[];
  editorUnlocked: boolean;
  editorName: string | null;
};

export type VisitInput = {
  id: string;
  path: string;
  ip?: string | null;
  geo?: VisitorGeo | null;
  ua?: ParsedUa | null;
  language?: string | null;
  referer?: string | null;
  editorUnlocked?: boolean;
  editorName?: string | null;
  at?: string;
};

export type HeaderReader = {
  get(name: string): string | null;
};

export function isValidVisitorId(
  value: string | undefined | null,
): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: VISITOR_MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua?.trim()) return false;
  return BOT_RE.test(ua);
}

function headerValue(
  headers: HeaderReader | Record<string, string | null | undefined> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as HeaderReader).get === "function") {
    const raw = (headers as HeaderReader).get(name);
    return raw && raw.trim() ? raw.trim() : null;
  }
  const record = headers as Record<string, string | null | undefined>;
  const direct = record[name] ?? record[name.toLowerCase()];
  if (direct && direct.trim()) return direct.trim();
  const key = Object.keys(record).find(
    (item) => item.toLowerCase() === name.toLowerCase(),
  );
  const value = key ? record[key] : null;
  return value && value.trim() ? value.trim() : null;
}

export function isPrefetchRequest(
  headers?: HeaderReader | Record<string, string | null | undefined>,
): boolean {
  const purpose = headerValue(headers, "purpose");
  const secPurpose = headerValue(headers, "sec-purpose");
  const nextPrefetch = headerValue(headers, "next-router-prefetch");
  const middlewarePrefetch = headerValue(headers, "x-middleware-prefetch");
  if (nextPrefetch === "1" || middlewarePrefetch === "1") return true;
  if (purpose?.toLowerCase() === "prefetch") return true;
  if (secPurpose?.toLowerCase().includes("prefetch")) return true;
  return false;
}

export function shouldLogVisit(input: {
  pathname: string;
  method?: string;
  userAgent?: string | null;
  headers?: HeaderReader | Record<string, string | null | undefined>;
}): boolean {
  const method = (input.method ?? "GET").toUpperCase();
  if (method !== "GET") return false;
  const pathname = input.pathname || "/";
  if (SKIP_PATH_RE.test(pathname) || STATIC_PATH_RE.test(pathname)) return false;
  if (isPrefetchRequest(input.headers)) return false;
  if (isBotUserAgent(input.userAgent ?? headerValue(input.headers, "user-agent"))) {
    return false;
  }
  return true;
}

export function clientIp(
  headers: HeaderReader | Record<string, string | null | undefined>,
): string | null {
  const forwarded =
    headerValue(headers, "x-forwarded-for") ||
    headerValue(headers, "x-vercel-forwarded-for") ||
    headerValue(headers, "x-real-ip");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim() ?? "";
  return first || null;
}

export function parseVercelGeo(
  headers: HeaderReader | Record<string, string | null | undefined>,
): VisitorGeo | null {
  const decode = (value: string | null): string | null => {
    if (!value) return null;
    try {
      return decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      return value;
    }
  };
  const city = decode(headerValue(headers, "x-vercel-ip-city"));
  const country = headerValue(headers, "x-vercel-ip-country");
  const region = headerValue(headers, "x-vercel-ip-country-region");
  if (!city && !country && !region) return null;
  return { city, country, region };
}

export function formatGeo(geo: VisitorGeo | null | undefined): string | null {
  if (!geo) return null;
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function decodeUriPart(value: string): string {
  const spaced = value.replace(/_/g, ".");
  return spaced.replace(/(\d+)[._](\d+)/g, "$1.$2");
}

export function parseUserAgent(ua: string | null | undefined): ParsedUa {
  const raw = ua?.trim() ?? "";
  if (!raw) return { device: null, os: null, browser: null };

  let os: string | null = null;
  const ios = raw.match(/CPU (?:iPhone )?OS (\d+)[._](\d+)/i);
  if (ios) os = `iOS ${ios[1]}.${ios[2]}`;
  const android = raw.match(/Android (\d+(?:[._]\d+)?)/i);
  if (!os && android) os = `Android ${decodeUriPart(android[1]!)}`;
  const mac = raw.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/i);
  if (!os && mac) os = `macOS ${mac[1]!.replace(/_/g, ".")}`;
  const win = raw.match(/Windows NT (\d+\.\d+)/i);
  if (!os && win) {
    const map: Record<string, string> = {
      "10.0": "Windows 10/11",
      "6.3": "Windows 8.1",
      "6.2": "Windows 8",
      "6.1": "Windows 7",
    };
    os = map[win[1]!] ?? `Windows NT ${win[1]}`;
  }
  if (!os && /CrOS/.test(raw)) os = "Chrome OS";
  if (!os && /Linux/.test(raw)) os = "Linux";

  let device: string | null = null;
  if (/iPhone/.test(raw)) device = "iPhone";
  else if (/iPad/.test(raw)) device = "iPad";
  else if (/Android/.test(raw)) {
    const model = raw.match(/Android [^;]+; ([^)]+?)(?: Build|\))/);
    const name = model?.[1]?.replace(/^(?:wv|\s)+/, "").trim();
    device = name && !/^[\d.]+$/.test(name) ? name : "Android";
  } else if (/Macintosh|Mac OS X/.test(raw)) device = "Mac";
  else if (/Windows/.test(raw)) device = "Windows PC";
  else if (/Linux/.test(raw)) device = "Linux";

  let browser: string | null = null;
  const named = (label: string, match: RegExpMatchArray | null) => {
    if (!match?.[1]) return null;
    const version = match[1].split(".")[0];
    return `${label} ${version}`;
  };
  if (/Edg(?:e|A|iOS)?\//.test(raw)) {
    browser = named("Edge", raw.match(/Edg(?:e|A|iOS)?\/([\d.]+)/));
  } else if (/CriOS\//.test(raw)) {
    browser = named("Chrome", raw.match(/CriOS\/([\d.]+)/));
  } else if (/FxiOS\//.test(raw)) {
    browser = named("Firefox", raw.match(/FxiOS\/([\d.]+)/));
  } else if (/OPR\/|Opera\//.test(raw)) {
    browser = named("Opera", raw.match(/(?:OPR|Opera)\/([\d.]+)/));
  } else if (/SamsungBrowser\//.test(raw)) {
    browser = named("Samsung Internet", raw.match(/SamsungBrowser\/([\d.]+)/));
  } else if (/Chrome\//.test(raw) && !/Chromium/.test(raw)) {
    browser = named("Chrome", raw.match(/Chrome\/([\d.]+)/));
  } else if (/Firefox\//.test(raw)) {
    browser = named("Firefox", raw.match(/Firefox\/([\d.]+)/));
  } else if (/Version\/[\d.]+ .*Safari\//.test(raw) || (/Safari\//.test(raw) && /Version\//.test(raw))) {
    browser = named("Safari", raw.match(/Version\/([\d.]+)/));
  } else if (/^curl\/([\d.]+)/i.test(raw)) {
    browser = `curl ${raw.match(/^curl\/([\d.]+)/i)?.[1] ?? ""}`.trim();
  } else if (/^wget\/([\d.]+)/i.test(raw)) {
    browser = `wget ${raw.match(/^wget\/([\d.]+)/i)?.[1] ?? ""}`.trim();
  }

  if (!device && browser?.startsWith("curl")) device = "curl";
  if (!device && browser?.startsWith("wget")) device = "wget";

  return { device, os, browser };
}

export function isSensitiveCookieName(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n || n === VISITOR_COOKIE) return false;
  if (n === "trip_editor") return true;
  return /(?:^|[._-])(?:pin|auth|token|secret|session|editor)(?:[._-]|$)/i.test(
    n,
  );
}

export function maskCookieValue(name: string, value: string): string {
  if (!isSensitiveCookieName(name)) return value;
  return "••••";
}

export function upsertVisitorRecord(
  current: VisitorRecord[],
  input: VisitInput,
): VisitorRecord[] {
  const now = input.at ?? new Date().toISOString();
  const nowMs = Date.parse(now);
  const cutoff = (Number.isFinite(nowMs) ? nowMs : Date.now()) - VISITOR_TTL_MS;
  const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
  const rows = current.filter((row) => {
    const seen = Date.parse(row.lastSeen);
    return Number.isFinite(seen) && seen >= cutoff;
  });

  const index = rows.findIndex((row) => row.id === input.id);
  if (index >= 0) {
    const prev = rows[index]!;
    const lastMs = Date.parse(prev.lastSeen);
    const recentSamePath =
      Number.isFinite(lastMs) &&
      Number.isFinite(nowMs) &&
      nowMs - lastMs >= 0 &&
      nowMs - lastMs < VISIT_DEBOUNCE_MS &&
      prev.paths[0] === path;
    const paths =
      prev.paths[0] === path ? prev.paths : [path, ...prev.paths].slice(0, MAX_PATHS);
    const geo = input.geo ?? prev.geo;
    rows[index] = {
      id: prev.id,
      firstSeen: prev.firstSeen,
      lastSeen: now,
      visitCount: recentSamePath ? prev.visitCount : prev.visitCount + 1,
      lastIp: input.ip ?? prev.lastIp,
      geo,
      device: input.ua?.device ?? prev.device,
      os: input.ua?.os ?? prev.os,
      browser: input.ua?.browser ?? prev.browser,
      language: input.language ?? prev.language,
      referer: input.referer ?? prev.referer,
      paths,
      editorUnlocked: input.editorUnlocked || prev.editorUnlocked,
      editorName: input.editorName ?? prev.editorName,
    };
  } else {
    rows.push({
      id: input.id,
      firstSeen: now,
      lastSeen: now,
      visitCount: 1,
      lastIp: input.ip ?? null,
      geo: input.geo ?? null,
      device: input.ua?.device ?? null,
      os: input.ua?.os ?? null,
      browser: input.ua?.browser ?? null,
      language: input.language ?? null,
      referer: input.referer ?? null,
      paths: [path],
      editorUnlocked: Boolean(input.editorUnlocked),
      editorName: input.editorName ?? null,
    });
  }

  rows.sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));
  return rows.slice(0, MAX_VISITORS);
}

function parseVisitors(raw: unknown): VisitorRecord[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (row): row is VisitorRecord =>
        !!row &&
        typeof row === "object" &&
        typeof (row as VisitorRecord).id === "string" &&
        typeof (row as VisitorRecord).firstSeen === "string" &&
        typeof (row as VisitorRecord).lastSeen === "string" &&
        typeof (row as VisitorRecord).visitCount === "number" &&
        Array.isArray((row as VisitorRecord).paths),
    );
  } catch {
    return [];
  }
}

export function isVisitorStoreWritable(): boolean {
  return isKvConfigured();
}

export async function recordVisit(input: VisitInput): Promise<void> {
  if (!isValidVisitorId(input.id)) return;
  if (!isKvConfigured()) {
    console.info("visitor", { id: input.id, path: input.path });
    return;
  }
  try {
    const current = parseVisitors(await redisCommand(["GET", STORE_KEY]));
    const next = upsertVisitorRecord(current, input);
    await redisCommand(["SET", STORE_KEY, JSON.stringify(next)]);
  } catch (error) {
    console.error("visitor-log write failed", error);
  }
}

export async function listVisitors(): Promise<VisitorRecord[]> {
  if (!isKvConfigured()) return [];
  try {
    const rows = parseVisitors(await redisCommand(["GET", STORE_KEY]));
    const cutoff = Date.now() - VISITOR_TTL_MS;
    return rows
      .filter((row) => {
        const seen = Date.parse(row.lastSeen);
        return Number.isFinite(seen) && seen >= cutoff;
      })
      .sort((a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen));
  } catch (error) {
    console.error("visitor-log read failed", error);
    return [];
  }
}

export async function getVisitor(
  id: string | null | undefined,
): Promise<VisitorRecord | null> {
  if (!isValidVisitorId(id)) return null;
  const rows = await listVisitors();
  return rows.find((row) => row.id === id) ?? null;
}

export function formatVisitorTime(iso: string, locale: Locale): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(new Date(ms));
  } catch {
    return iso;
  }
}
