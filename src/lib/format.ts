import { JPY_PER_RM, type SpendCurrency } from "@/lib/types";

export function formatDay(date: string | null) {
  if (!date) return "No date";
  const day = date.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${day}T12:00:00`));
}

export function formatTabDate(date: string | null) {
  if (!date) return "—";
  const d = new Date(`${date.slice(0, 10)}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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

export function formatTripSpan(start: string | null, end: string | null) {
  if (!start && !end) return "Dates TBD";
  if (start && end) {
    const a = tripDateParts(start);
    const b = tripDateParts(end);
    return `${a.n} ${a.month.toUpperCase()} ${a.year}(${a.weekday}) - ${b.n} ${b.month} ${b.year} (${b.weekday})`;
  }
  const only = tripDateParts((start ?? end)!);
  return `${only.n} ${only.month} ${only.year} (${only.weekday})`;
}

export function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates TBD";
  if (start && end) return `${formatDay(start)} → ${formatDay(end)}`;
  return formatDay(start ?? end);
}

export function formatTime(start: string | null) {
  if (!start || !start.includes("T")) return null;
  const parsed = new Date(start);
  if (!Number.isNaN(parsed.getTime())) {
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

function dayDiff(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function tripCountdown(
  start: string | null,
  end: string | null,
  today: string,
) {
  const startKey = dateKey(start);
  if (!startKey) return null;

  const endKey = dateKey(end) ?? startKey;
  const daysUntilStart = dayDiff(today, startKey);
  const tripLength = dayDiff(startKey, endKey) + 1;

  if (daysUntilStart > 0) {
    const dayWord = daysUntilStart === 1 ? "day" : "days";
    return {
      label: "Countdown",
      primary: `${daysUntilStart} ${dayWord}`,
      secondary: "until departure",
    };
  }

  if (daysUntilStart === 0) {
    return {
      label: "Countdown",
      primary: "Today",
      secondary: "departure day",
    };
  }

  const daysSinceStart = -daysUntilStart;
  if (today <= endKey) {
    const dayNumber = daysSinceStart + 1;
    return {
      label: "On trip",
      primary: `Day ${dayNumber}`,
      secondary:
        tripLength > 1 ? `of ${tripLength} · ${endKey.slice(5)} last day` : undefined,
    };
  }

  return {
    label: "Trip",
    primary: "Complete",
    secondary: "hope you had a great time",
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
  return `${date}T${hh}:${mm}:00`;
}

export function timeToMinutes(time: string | null) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function formatGapMinutes(minutes: number) {
  if (minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m free`;
  if (hours > 0) return `${hours}h free`;
  return `${mins}m free`;
}

export function gapBetweenStarts(
  previous: string | null,
  next: string | null,
) {
  const a = timeToMinutes(formatTime(previous));
  const b = timeToMinutes(formatTime(next));
  if (a == null || b == null || b <= a) return null;
  return formatGapMinutes(b - a);
}

export function formatDualRmYen(rmAmount: number, jpyPerRm = JPY_PER_RM) {
  const yen = Math.round(rmAmount * jpyPerRm);
  return `${formatRm(rmAmount)} · ${formatYen(yen)}`;
}
