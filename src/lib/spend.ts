import { dateKey, formatTime } from "@/lib/format";
import {
  DEFAULT_SPEND_CURRENCY,
  JPY_PER_RM,
  SPEND_CATEGORIES,
  type SpendCurrency,
  type SpendItem,
  type TripDay,
} from "@/lib/types";

export const UNSCHEDULED_KEY = "unscheduled";

export function parseSpendCurrency(value: string | null): SpendCurrency {
  return value === "Yen" ? "Yen" : DEFAULT_SPEND_CURRENCY;
}

export function toRm(
  amount: number,
  currency: SpendCurrency,
  jpyPerRm = JPY_PER_RM,
) {
  return currency === "Yen" ? amount / jpyPerRm : amount;
}

export function sumRm(items: SpendItem[], kind?: string, jpyPerRm = JPY_PER_RM) {
  return items
    .filter((item) => (kind ? item.kind === kind : true))
    .reduce(
      (sum, item) => sum + toRm(item.amount, item.currency, jpyPerRm),
      0,
    );
}

export function byDay(items: SpendItem[], dayId: string) {
  return items.filter((item) => item.dayIds.includes(dayId));
}

export function byCategory(items: SpendItem[], jpyPerRm = JPY_PER_RM) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.category ?? "Other";
    map.set(key, (map.get(key) ?? 0) + toRm(item.amount, item.currency, jpyPerRm));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function moneySummary(items: SpendItem[], jpyPerRm = JPY_PER_RM) {
  const estimate = sumRm(items, "Estimate", jpyPerRm);
  const actual = sumRm(items, "Actual", jpyPerRm);
  return {
    estimate,
    actual,
    remaining: estimate - actual,
  };
}

export function spendWhen(item: SpendItem, days: TripDay[]): string | null {
  if (item.start) return item.start;
  const day = days.find((entry) => item.dayIds.includes(entry.id));
  return day?.date ?? null;
}

export type TimelineGroup = {
  key: string;
  date: string | null;
  items: SpendItem[];
  totalRm: number;
};

export function timelineGroups(
  items: SpendItem[],
  days: TripDay[],
  jpyPerRm = JPY_PER_RM,
): TimelineGroup[] {
  const map = new Map<string, SpendItem[]>();
  for (const item of items) {
    const key = dateKey(spendWhen(item, days)) ?? UNSCHEDULED_KEY;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === UNSCHEDULED_KEY) return 1;
    if (b === UNSCHEDULED_KEY) return -1;
    return a.localeCompare(b);
  });

  return keys.map((key) => {
    const groupItems = (map.get(key) ?? []).slice().sort((a, b) => {
      const timeA = formatTime(spendWhen(a, days)) ?? "99:99";
      const timeB = formatTime(spendWhen(b, days)) ?? "99:99";
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return a.name.localeCompare(b.name);
    });
    return {
      key,
      date: key === UNSCHEDULED_KEY ? null : key,
      items: groupItems,
      totalRm: sumRm(groupItems, undefined, jpyPerRm),
    };
  });
}

export type CategoryRow = {
  category: (typeof SPEND_CATEGORIES)[number];
  amountRm: number;
  percent: number;
};

export function categoryBreakdown(
  items: SpendItem[],
  jpyPerRm = JPY_PER_RM,
): CategoryRow[] {
  const totals = new Map<string, number>(
    SPEND_CATEGORIES.map((category) => [category, 0]),
  );
  for (const item of items) {
    const key = SPEND_CATEGORIES.includes(
      item.category as (typeof SPEND_CATEGORIES)[number],
    )
      ? (item.category as (typeof SPEND_CATEGORIES)[number])
      : "Other";
    totals.set(key, (totals.get(key) ?? 0) + toRm(item.amount, item.currency, jpyPerRm));
  }
  const total = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return SPEND_CATEGORIES.map((category) => {
    const amountRm = totals.get(category) ?? 0;
    return {
      category,
      amountRm,
      percent: total > 0 ? Math.round((amountRm / total) * 100) : 0,
    };
  });
}

export function topSpend(
  items: SpendItem[],
  n = 10,
  jpyPerRm = JPY_PER_RM,
): SpendItem[] {
  return items
    .slice()
    .sort(
      (a, b) =>
        toRm(b.amount, b.currency, jpyPerRm) -
        toRm(a.amount, a.currency, jpyPerRm),
    )
    .slice(0, n);
}
