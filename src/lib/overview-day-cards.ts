import { dateKey } from "@/lib/format";

function datedKey(value: string | null | undefined): string | null {
  const key = dateKey(typeof value === "string" ? value.trim() : value ?? null);
  return key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

export type OverviewDayCardState = "past" | "today" | "future";

const MONTH_ABBR = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** Visible day-number on an Overview card: D1, D2, … */
export function formatOverviewDayCardLabel(dayNumber: number): string {
  return `D${dayNumber}`;
}

/** Visible date on an Overview card: nov6, nov10, … (no leading zero). */
export function formatOverviewDayCardDate(
  date: string | null | undefined,
): string {
  const key = datedKey(date);
  if (!key) return "";
  const month = Number(key.slice(5, 7));
  const day = Number(key.slice(8, 10));
  const abbr = MONTH_ABBR[month - 1];
  if (!abbr || !Number.isFinite(day) || day < 1) return "";
  return `${abbr}${day}`;
}

export type OverviewDayCardModel = {
  id: string;
  date: string;
  index: number;
  dayNumber: number;
  state: OverviewDayCardState;
};

export type OverviewDatedDay = {
  id: string;
  date: string | null;
};

function dayState(
  date: string,
  today: string | null,
): OverviewDayCardState {
  if (!today) return "future";
  if (date < today) return "past";
  if (date === today) return "today";
  return "future";
}

/**
 * Build one card model per dated trip day, in the given order.
 * `today` should be an Asia/Tokyo YYYY-MM-DD key (e.g. tokyoToday()).
 */
export function buildOverviewDayCards(
  datedDays: readonly OverviewDatedDay[],
  today: string,
): OverviewDayCardModel[] {
  const todayKey = datedKey(today);
  const cards: OverviewDayCardModel[] = [];
  for (const day of datedDays) {
    const date = datedKey(day.date);
    if (!date || !day.id) continue;
    const index = cards.length;
    cards.push({
      id: day.id,
      date,
      index,
      dayNumber: index + 1,
      state: dayState(date, todayKey),
    });
  }
  return cards;
}

/** Index of the card whose date is today, or null before/after the trip. */
export function currentOverviewDayIndex(
  cards: readonly Pick<OverviewDayCardModel, "state">[],
): number | null {
  const index = cards.findIndex((card) => card.state === "today");
  return index >= 0 ? index : null;
}
