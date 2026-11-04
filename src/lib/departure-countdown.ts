import { dateKey, formatTime, tokyoWallDateTime } from "@/lib/format";
import type { Transit, TripDay } from "@/lib/types";

/** Under this many ms before departure the countdown switches from days to hours. */
export const HOURS_THRESHOLD_MS = 48 * 60 * 60 * 1000;
/** Under this many ms before departure the countdown shows minutes. */
export const MINUTES_THRESHOLD_MS = 60 * 60 * 1000;

export type DepartureCountdown =
  | { mode: "days" }
  | { mode: "hours"; hours: number }
  | { mode: "minutes"; minutes: number }
  | { mode: "today" }
  | { mode: "departed" };

/**
 * Pure countdown mode for a departure instant (ISO with offset) and `now` (ms).
 * - unknown departure → "days" (caller keeps its day-based wording)
 * - ≥ 48h → "days"; < 48h → "hours" (ceil, never 0); < 1h → "minutes" (ceil, min 1)
 * - at/after departure → "departed" (caller keeps on-trip / complete behaviour)
 * "today" is reserved for callers that know it is the departure day without a time.
 */
export function departureCountdown(
  departureIso: string | null,
  nowMs: number,
): DepartureCountdown {
  if (!departureIso) return { mode: "days" };
  const at = new Date(departureIso).getTime();
  if (Number.isNaN(at)) return { mode: "days" };
  const left = at - nowMs;
  if (left <= 0) return { mode: "departed" };
  if (left >= HOURS_THRESHOLD_MS) return { mode: "days" };
  if (left >= MINUTES_THRESHOLD_MS) {
    return { mode: "hours", hours: Math.ceil(left / 3_600_000) };
  }
  return { mode: "minutes", minutes: Math.max(1, Math.ceil(left / 60_000)) };
}

/**
 * Departure instant = earliest-start Flight on the first dated day, as Asia/Tokyo
 * wall time via tokyoWallDateTime. Falls back to any transit with a start on that
 * day. No time found → null (documented fallback: day-based countdown on the
 * start date).
 */
export function departureInstant(
  days: TripDay[],
  transit: Transit[],
): string | null {
  const first = days.find((day) => day.date);
  const date = dateKey(first?.date ?? null);
  if (!first || !date) return null;
  const onDay = transit.filter(
    (item) => item.dayIds.includes(first.id) || dateKey(item.date) === date,
  );
  const timed = (items: Transit[]) =>
    items
      .map((item) => formatTime(item.start))
      .filter((time): time is string => Boolean(time))
      .sort()[0] ?? null;
  const time =
    timed(onDay.filter((item) => item.mode === "Flight")) ?? timed(onDay);
  if (!time) return null;
  return tokyoWallDateTime(date, time) || null;
}
