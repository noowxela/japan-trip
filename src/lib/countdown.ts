import { dateKey, formatDay, formatTime } from "@/lib/format";
import { labelCity, type Locale } from "@/lib/i18n/dictionaries";
import type { Place, PrepItem, Transit, TripDay } from "@/lib/types";

export type CountdownTripData = {
  days: TripDay[];
  places?: Place[];
  transit?: Transit[];
  prep?: PrepItem[];
};

export type CountdownMessage = {
  id: string;
  title: string;
  body: string;
  url: "/";
  tag: "countdown";
};

export type ComputeCountdownOpts = {
  /** Default `Asia/Kuala_Lumpur`. */
  timeZone?: string;
  /** Default `zh`. */
  locale?: Locale;
};

const DEFAULT_TZ = "Asia/Kuala_Lumpur";

/** Calendar YYYY-MM-DD in the given IANA time zone. */
export function calendarDateKeyFrom(
  now: Date,
  timeZone: string = DEFAULT_TZ,
): string {
  return now.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Whole calendar-day difference using UTC noon anchors
 * (avoids local-TZ / DST / ms÷24h rounding).
 */
export function calendarDayDiff(from: string, to: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NaN;
  }
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy!, fm! - 1, fd!, 12);
  const b = Date.UTC(ty!, tm! - 1, td!, 12);
  return Math.round((b - a) / 86_400_000);
}

function tripBounds(days: TripDay[]): { start: string; end: string } | null {
  const dated = days
    .map((day) => dateKey(day.date))
    .filter(
      (value): value is string =>
        typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value),
    )
    .sort();
  if (!dated.length) return null;
  return { start: dated[0]!, end: dated[dated.length - 1]! };
}

function cityLabelFor(city: string | null | undefined, locale: Locale): string | null {
  if (!city?.trim()) return null;
  return labelCity(locale, city.trim()) ?? city.trim();
}

function routeLabel(from: string, to: string): string {
  const a = from.trim();
  const b = to.trim();
  if (a && b) return `${a}→${b}`;
  return a || b;
}

/** Collapse spaces and treat `->` / `→` as the same for containment checks. */
function normalizeRouteToken(value: string): string {
  return value.replace(/\s+/g, "").replace(/->/g, "→");
}

function nameAlreadyHasRoute(name: string, route: string): boolean {
  if (!name || !route) return false;
  return normalizeRouteToken(name).includes(normalizeRouteToken(route));
}

function transitOnDay(item: Transit, day: string): boolean {
  const key = dateKey(item.start) ?? dateKey(item.date);
  return key === day;
}

function placeOnDay(place: Place, dayId: string | null): boolean {
  if (!dayId) return false;
  return place.dayIds.includes(dayId);
}

function transitOnDayId(item: Transit, dayId: string | null): boolean {
  if (!dayId) return false;
  return item.dayIds.includes(dayId);
}

type TimedStop = { time: string; name: string; minutes: number };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function departureTransitBody(
  transit: Transit[],
  day: string,
): string | null {
  const legs = transit
    .filter((item) => transitOnDay(item, day))
    .map((item) => {
      const time = formatTime(item.start) ?? formatTime(item.date);
      if (!time) return null;
      const route = routeLabel(item.from, item.to);
      const name = item.name.trim();
      const mid = nameAlreadyHasRoute(name, route)
        ? name
        : [name, route].filter(Boolean).join(" ");
      return { time, minutes: toMinutes(time), text: mid || name || route };
    })
    .filter((v): v is { time: string; minutes: number; text: string } => Boolean(v?.text));
  legs.sort((a, b) => a.minutes - b.minutes);
  const first = legs[0];
  if (!first) return null;
  return `${first.time} ${first.text}`;
}

function firstStopBody(
  dayRow: TripDay | undefined,
  dayKey: string,
  places: Place[],
  transit: Transit[],
  locale: Locale,
): string | null {
  const dayId = dayRow?.id ?? null;
  const stops: TimedStop[] = [];

  for (const place of places) {
    const onDay =
      placeOnDay(place, dayId) ||
      (dateKey(place.start) === dayKey && !place.pending);
    if (!onDay || place.pending) continue;
    const time = formatTime(place.start);
    if (!time) continue;
    const name = place.name.trim();
    if (!name) continue;
    stops.push({ time, name, minutes: toMinutes(time) });
  }

  for (const item of transit) {
    const onDay =
      transitOnDayId(item, dayId) || transitOnDay(item, dayKey);
    if (!onDay) continue;
    const time = formatTime(item.start) ?? formatTime(item.date);
    if (!time) continue;
    const name = item.name.trim() || routeLabel(item.from, item.to);
    if (!name) continue;
    stops.push({ time, name, minutes: toMinutes(time) });
  }

  stops.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
  const first = stops[0];
  if (!first) return null;
  if (locale === "zh") {
    return `第一站 ${first.time} ${first.name}`;
  }
  return `First stop ${first.time} ${first.name}`;
}

function prepBody(unchecked: PrepItem[], locale: Locale): string {
  const names = unchecked
    .slice(0, 3)
    .map((item) => item.name.trim())
    .filter(Boolean);
  const count = unchecked.length;
  if (locale === "zh") {
    const list = names.join("、");
    return names.length
      ? `Prep 还有 ${count} 项未完成：${list}${count > names.length ? "…" : ""}`
      : `Prep 还有 ${count} 项未完成`;
  }
  const list = names.join(", ");
  return names.length
    ? `Prep: ${count} left — ${list}${count > names.length ? "…" : ""}`
    : `Prep: ${count} item${count === 1 ? "" : "s"} left`;
}

function departureDateBody(start: string, locale: Locale): string {
  const formatted = formatDay(start, locale);
  return locale === "zh" ? `出发日 ${formatted}` : `Departure ${formatted}`;
}

/**
 * Pure morning countdown planner. Uses calendar “today” in opts.timeZone
 * (default Asia/Kuala_Lumpur). Returns null after trip end or with no dated Days.
 */
export function computeCountdown(
  data: CountdownTripData,
  now: Date,
  opts: ComputeCountdownOpts = {},
): CountdownMessage | null {
  const locale = opts.locale ?? "zh";
  const timeZone = opts.timeZone ?? DEFAULT_TZ;
  const today = calendarDateKeyFrom(now, timeZone);
  const bounds = tripBounds(data.days);
  if (!bounds) return null;

  const { start, end } = bounds;
  if (today > end) return null;

  const places = data.places ?? [];
  const transit = data.transit ?? [];
  const prep = data.prep ?? [];
  const unchecked = prep.filter((item) => !item.done);

  const id = `countdown:${today}`;
  const base = { id, url: "/" as const, tag: "countdown" as const };

  const daysUntil = calendarDayDiff(today, start);

  // Before trip (N >= 1) or departure day / during
  if (daysUntil >= 2) {
    const title =
      locale === "zh"
        ? `还有 ${daysUntil} 天出发去日本 🇯🇵`
        : `${daysUntil} days until Japan 🇯🇵`;
    const body =
      daysUntil <= 7 && unchecked.length > 0
        ? prepBody(unchecked, locale)
        : departureDateBody(start, locale);
    return { ...base, title, body };
  }

  if (daysUntil === 1) {
    const title =
      locale === "zh" ? "明天出发去日本 🇯🇵" : "Japan trip tomorrow 🇯🇵";
    const body =
      unchecked.length > 0
        ? prepBody(unchecked, locale)
        : departureDateBody(start, locale);
    return { ...base, title, body };
  }

  // Departure day (today == start)
  if (today === start) {
    const title =
      locale === "zh" ? "今天出发！🇯🇵" : "Departure day! 🇯🇵";
    const transitBody = departureTransitBody(transit, today);
    const dayRow = data.days.find((d) => dateKey(d.date) === today);
    const stopBody =
      transitBody ??
      firstStopBody(dayRow, today, places, transit, locale) ??
      (dayRow?.name.trim() || departureDateBody(start, locale));
    return { ...base, title, body: stopBody };
  }

  // During trip: start < today <= end
  if (today > start && today <= end) {
    const dayNumber = calendarDayDiff(start, today) + 1;
    const dayRow = data.days.find((d) => dateKey(d.date) === today);
    const city = cityLabelFor(dayRow?.city, locale);
    const isLast = today === end;

    let title: string;
    if (locale === "zh") {
      const parts = [`日本第 ${dayNumber} 天`];
      if (city) parts.push(city);
      if (isLast) parts.push("最后一天");
      title = parts.join(" · ");
    } else {
      const parts = [`Japan day ${dayNumber}`];
      if (city) parts.push(city);
      if (isLast) parts.push("last day");
      title = parts.join(" · ");
    }

    const body =
      firstStopBody(dayRow, today, places, transit, locale) ??
      dayRow?.name.trim() ??
      (locale === "zh" ? `行程第 ${dayNumber} 天` : `Trip day ${dayNumber}`);

    return { ...base, title, body };
  }

  return null;
}
