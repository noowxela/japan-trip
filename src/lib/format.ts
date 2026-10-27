import { t, type Locale } from "@/lib/i18n/dictionaries";
import { JPY_PER_RM, type SpendCurrency } from "@/lib/types";

export function formatDay(date: string | null, locale: Locale = "zh") {
  if (!date) return t(locale, "common.noDate");
  const day = date.slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  if (locale === "zh") {
    const month = d.getMonth() + 1;
    const dateNum = d.getDate();
    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(
      d,
    );
    return `${month}月${dateNum}日 ${weekday}`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Schedule-style day header: "10月25日 周日" / "Sun 25 Oct". */
export function formatTimelineDate(date: string | null, locale: Locale = "zh") {
  if (!date) return null;
  return formatDay(date, locale);
}

export function tokyoNowTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function formatTabDate(date: string | null) {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Nights between check-in and check-out (null if either missing or non-positive). */
export function nightsBetween(
  checkIn: string | null,
  checkOut: string | null,
): number | null {
  const a = dateKey(checkIn);
  const b = dateKey(checkOut);
  if (!a || !b) return null;
  const n = dayDiff(a, b);
  return n > 0 ? n : null;
}

export function formatTabWeekday(date: string | null, locale: Locale = "zh") {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
    weekday: "short",
  }).format(d);
}

export function formatTabDayNumber(date: string | null) {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  return String(d.getDate());
}

function tripDateParts(date: string) {
  const day = date.slice(0, 10);
  const d = new Date(`${day}T12:00:00`);
  return {
    n: d.getDate(),
    month: new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d),
    year: d.getFullYear(),
    weekday: new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(d),
  };
}

export function formatTripSpan(
  start: string | null,
  end: string | null,
  locale: Locale = "zh",
) {
  if (!start && !end) return t(locale, "common.datesTbd");
  if (locale === "zh") {
    if (start && end) {
      return `${formatDay(start, "zh")} – ${formatDay(end, "zh")}`;
    }
    return formatDay((start ?? end)!, "zh");
  }
  if (start && end) {
    const a = tripDateParts(start);
    const b = tripDateParts(end);
    return `${a.n} ${a.month.toUpperCase()} ${a.year}(${a.weekday}) - ${b.n} ${b.month} ${b.year} (${b.weekday})`;
  }
  const only = tripDateParts((start ?? end)!);
  return `${only.n} ${only.month} ${only.year} (${only.weekday})`;
}

export function formatRange(
  start: string | null,
  end: string | null,
  locale: Locale = "zh",
) {
  if (!start && !end) return t(locale, "common.datesTbd");
  if (start && end) {
    return `${formatDay(start, locale)} → ${formatDay(end, locale)}`;
  }
  return formatDay(start ?? end, locale);
}

export function formatTimeAmPm(start: string | null) {
  const time = formatTime(start);
  if (!time) return null;
  const [hourPart, minute] = time.split(":");
  let hour = Number(hourPart);
  if (!Number.isFinite(hour) || !minute) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${suffix}`;
}

const HAS_TZ_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Build an Asia/Tokyo wall-clock datetime with an explicit +09:00 offset.
 * Never construct via `new Date(local string)` — trip times are Tokyo everywhere.
 */
export function tokyoWallDateTime(date: string, time: string): string {
  const day = date.trim().slice(0, 10);
  const hm = time.trim().slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(hm)) return "";
  return `${day}T${hm}:00+09:00`;
}

/** Normalize a datetime so offset-less values are treated as Asia/Tokyo. */
export function ensureTokyoOffset(value: string): string {
  const raw = value.trim();
  if (!raw || !raw.includes("T")) return raw;
  if (HAS_TZ_OFFSET.test(raw)) return raw;
  if (/T\d{2}:\d{2}$/.test(raw)) return `${raw}:00+09:00`;
  if (/T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) return `${raw}+09:00`;
  return raw;
}

/** Parse trip datetimes; offset-less local wall times are Asia/Tokyo. */
export function parseTripInstant(value: string): Date | null {
  const normalized = ensureTokyoOffset(value.trim());
  if (!normalized) return null;
  const withTime = normalized.includes("T")
    ? normalized
    : `${normalized.slice(0, 10)}T00:00:00+09:00`;
  const parsed = new Date(withTime);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTime(start: string | null) {
  if (!start || !start.includes("T")) return null;
  const parsed = parseTripInstant(start);
  if (parsed) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
      timeZone: "Asia/Tokyo",
    }).formatToParts(parsed);
    const hour = parts.find((part) => part.type === "hour")?.value;
    const minute = parts.find((part) => part.type === "minute")?.value;
    if (hour && minute) return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  const time = start.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

export function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRm(amount: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSpend(amount: number, currency: SpendCurrency | null) {
  return currency === "Yen" ? formatYen(amount) : formatRm(amount);
}

export function tokyoToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export function dayDiff(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function tripCountdown(
  start: string | null,
  end: string | null,
  today: string,
  locale: Locale = "zh",
) {
  const startKey = dateKey(start);
  if (!startKey) return null;

  const endKey = dateKey(end) ?? startKey;
  const daysUntilStart = dayDiff(today, startKey);
  const tripLength = dayDiff(startKey, endKey) + 1;

  if (daysUntilStart > 0) {
    const dayWord = t(
      locale,
      daysUntilStart === 1 ? "countdown.day" : "countdown.days",
    );
    return {
      label: t(locale, "countdown.label"),
      primary: `${daysUntilStart} ${dayWord}`,
      secondary: t(locale, "countdown.untilDeparture"),
    };
  }

  if (daysUntilStart === 0) {
    return {
      label: t(locale, "countdown.label"),
      primary: t(locale, "countdown.today"),
      secondary: t(locale, "countdown.departureDay"),
    };
  }

  const daysSinceStart = -daysUntilStart;
  if (today <= endKey) {
    const dayNumber = daysSinceStart + 1;
    return {
      label: t(locale, "countdown.onTrip"),
      primary: t(locale, "countdown.dayOf", { n: dayNumber }),
      secondary:
        tripLength > 1
          ? t(locale, "countdown.ofLast", {
              total: tripLength,
              end: endKey.slice(5),
            })
          : undefined,
    };
  }

  return {
    label: t(locale, "countdown.trip"),
    primary: t(locale, "countdown.complete"),
    secondary: t(locale, "countdown.hope"),
  };
}

export function dateKey(value: string | null) {
  return value ? value.slice(0, 10) : null;
}

export function startBefore(
  start: string | null,
  dayDate: string | null,
  minutes = 15,
) {
  const date = dateKey(dayDate);
  const time = formatTime(start);
  if (!date || !time) return "";
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.max(0, hour * 60 + minute - minutes);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return tokyoWallDateTime(date, `${hh}:${mm}`);
}

export function timeToMinutes(time: string | null) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function formatGapMinutes(minutes: number, locale: Locale = "zh") {
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return t(locale, "gap.freeHm", { h: hours, m: mins });
  }
  if (hours > 0) return t(locale, "gap.freeH", { h: hours });
  return t(locale, "gap.freeM", { m: mins });
}

export function minutesBetweenStarts(
  previous: string | null,
  next: string | null,
) {
  const a = timeToMinutes(formatTime(previous));
  const b = timeToMinutes(formatTime(next));
  if (a == null || b == null || b <= a) return null;
  return b - a;
}

export function gapBetweenStarts(
  previous: string | null,
  next: string | null,
  locale: Locale = "zh",
) {
  const minutes = minutesBetweenStarts(previous, next);
  if (minutes == null) return null;
  return formatGapMinutes(minutes, locale);
}

export function formatCachedAt(iso: string) {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "earlier";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).format(parsed);
}

export function formatDualRmYen(rmAmount: number, jpyPerRm = JPY_PER_RM) {
  const yen = Math.round(rmAmount * jpyPerRm);
  return `${formatRm(rmAmount)} · ${formatYen(yen)}`;
}
