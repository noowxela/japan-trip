import { dateKey, dayDiff, formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { PrepItem, Stay, Transit, TripDay } from "@/lib/types";

export type ReminderTripData = {
  days: TripDay[];
  transit: Transit[];
  stays: Stay[];
  prep: PrepItem[];
};

export type Reminder = {
  id: string;
  title: string;
  body: string;
  url: string;
  tag: string;
};

export type ComputeRemindersOpts = {
  /** Default `zh`. */
  locale?: Locale;
  /** Days before first trip day to nudge unchecked prep. Default `[3, 1]`. */
  prepDaysBefore?: number[];
  /** Optional “departure tomorrow” reminder. Default `true`. */
  includeDepartureTomorrow?: boolean;
};

const DEFAULT_PREP_DAYS = [3, 1] as const;

const MODE_LABEL: Record<Locale, Record<string, string>> = {
  zh: {
    Shinkansen: "新干线",
    Flight: "航班",
    Metro: "地铁",
    Bus: "巴士",
    Walk: "步行",
  },
  en: {
    Shinkansen: "Shinkansen",
    Flight: "Flight",
    Metro: "Metro",
    Bus: "Bus",
    Walk: "Walk",
  },
};

/** Calendar YYYY-MM-DD in Asia/Tokyo for an instant. */
export function tokyoDateKeyFrom(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/** Add whole calendar days to a YYYY-MM-DD key (no DST in Tokyo). */
export function addCalendarDays(day: string, days: number): string {
  const key = dateKey(day);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return "";
  const [y, m, d] = key.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function firstTripDay(days: TripDay[]): string | null {
  const dated = days
    .map((day) => dateKey(day.date))
    .filter((value): value is string => Boolean(value))
    .sort();
  return dated[0] ?? null;
}

function lastTripDay(days: TripDay[]): string | null {
  const dated = days
    .map((day) => dateKey(day.date))
    .filter((value): value is string => Boolean(value))
    .sort();
  return dated.length ? dated[dated.length - 1]! : null;
}

function dayUrl(days: TripDay[], day: string): string {
  const match = days.find((item) => dateKey(item.date) === day);
  return match ? `/schedule?day=${match.id}` : "/schedule";
}

function modeLabel(mode: string | null, locale: Locale): string {
  if (!mode) return locale === "zh" ? "交通" : "Transit";
  return MODE_LABEL[locale][mode] ?? mode;
}

function transitHint(mode: string | null, locale: Locale): string {
  const ticket =
    mode === "Shinkansen" || mode === "Flight" || mode === "Bus";
  if (locale === "zh") {
    return ticket ? "记得取票" : "提前到站";
  }
  return ticket
    ? "Remember to collect tickets"
    : "Arrive early";
}

function routeLabel(from: string, to: string): string {
  const a = from.trim();
  const b = to.trim();
  if (a && b) return `${a}→${b}`;
  return a || b;
}

function transitDay(item: Transit): string | null {
  return dateKey(item.start) ?? dateKey(item.date);
}

function stayCheckInDay(stay: Stay): string | null {
  return dateKey(stay.checkIn);
}

function stayCheckInTime(stay: Stay): string | null {
  if (!stay.checkIn || !stay.checkIn.includes("T")) return null;
  return formatTime(stay.checkIn);
}

function prepSummary(
  unchecked: PrepItem[],
  locale: Locale,
): { title: string; body: string } {
  const names = unchecked.slice(0, 3).map((item) => item.name.trim()).filter(Boolean);
  const count = unchecked.length;
  if (locale === "zh") {
    const list = names.join("、");
    const more = count > names.length ? `等 ${count} 项` : `${count} 项`;
    return {
      title: "出发前准备",
      body: names.length
        ? `还有未完成：${list}${count > names.length ? `（共 ${count} 项）` : ""}`
        : `还有 ${more} 未完成`,
    };
  }
  const list = names.join(", ");
  return {
    title: "Prep before departure",
    body: names.length
      ? `${count} left: ${list}${count > names.length ? "…" : ""}`
      : `${count} unchecked prep item${count === 1 ? "" : "s"}`,
  };
}

/**
 * Pure reminder planner for the daily cron. Uses Asia/Tokyo calendar dates.
 * Designed for evening-before delivery (cron ~20:00 JST): “tomorrow” = next Tokyo day.
 */
export function computeReminders(
  tripData: ReminderTripData,
  now: Date,
  opts: ComputeRemindersOpts = {},
): Reminder[] {
  const locale = opts.locale ?? "zh";
  const prepDaysBefore = opts.prepDaysBefore ?? [...DEFAULT_PREP_DAYS];
  const includeDeparture = opts.includeDepartureTomorrow ?? true;

  const today = tokyoDateKeyFrom(now);
  const tomorrow = addCalendarDays(today, 1);
  if (!tomorrow) return [];

  const start = firstTripDay(tripData.days);
  const end = lastTripDay(tripData.days);

  // Past trip (and no dates): nothing to remind.
  if (end && today > end) return [];
  if (!start && tripData.transit.length === 0 && tripData.stays.length === 0) {
    return [];
  }

  const byId = new Map<string, Reminder>();

  const put = (reminder: Reminder) => {
    if (!byId.has(reminder.id)) byId.set(reminder.id, reminder);
  };

  // (a) Tomorrow's transit legs
  for (const item of tripData.transit) {
    const day = transitDay(item);
    if (!day || day !== tomorrow) continue;
    if (item.mode === "Walk") continue;

    const time = formatTime(item.start) ?? formatTime(item.date);
    const mode = modeLabel(item.mode, locale);
    const route = routeLabel(item.from, item.to);
    const hint = transitHint(item.mode, locale);
    const timeBit = time ? `${time} ` : "";
    const title =
      locale === "zh"
        ? `明天 ${timeBit}${mode}`.replace(/\s+/g, " ").trim()
        : `Tomorrow ${timeBit}${mode}`.replace(/\s+/g, " ").trim();
    const bodyParts = [route, hint].filter(Boolean);
    put({
      id: `transit:${item.id}:${day}`,
      title,
      body: bodyParts.join(locale === "zh" ? "，" : " — "),
      url: dayUrl(tripData.days, day),
      tag: `transit-${item.id}`,
    });
  }

  // (b) Hotel check-in tomorrow
  for (const stay of tripData.stays) {
    const day = stayCheckInDay(stay);
    if (!day || day !== tomorrow) continue;
    const time = stayCheckInTime(stay);
    const name = stay.name.trim() || (locale === "zh" ? "酒店" : "Hotel");
    const title = locale === "zh" ? "明天入住" : "Check-in tomorrow";
    const body =
      locale === "zh"
        ? time
          ? `${name}，入住 ${time}`
          : name
        : time
          ? `${name} · check-in ${time}`
          : name;
    put({
      id: `stay:${stay.id}:${day}`,
      title,
      body,
      url: "/stays",
      tag: `stay-${stay.id}`,
    });
  }

  // (c) Unchecked prep N days before departure
  if (start) {
    const until = dayDiff(today, start);
    if (prepDaysBefore.includes(until)) {
      const unchecked = tripData.prep.filter((item) => !item.done);
      if (unchecked.length > 0) {
        const summary = prepSummary(unchecked, locale);
        put({
          id: `prep:${until}:${start}`,
          title: summary.title,
          body: summary.body,
          url: "/prep",
          tag: `prep-${until}`,
        });
      }
    }
  }

  // (d) Departure tomorrow
  if (includeDeparture && start && start === tomorrow) {
    put({
      id: `departure:${start}`,
      title: locale === "zh" ? "明天出发" : "Departure tomorrow",
      body:
        locale === "zh"
          ? `行程从 ${start} 开始，检查行李与票务`
          : `Trip starts ${start} — check bags and tickets`,
      url: "/",
      tag: "departure",
    });
  }

  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
