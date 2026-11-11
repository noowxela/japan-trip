import { dateKey, formatTime, formatTimelineDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import {
  DEFAULT_SPEND_CURRENCY,
  JPY_PER_RM,
  SPEND_CATEGORIES,
  type SpendCurrency,
  type SpendItem,
  type TripDay,
} from "@/lib/types";

/** Timeline group for undated spends and purchases before the first trip day. */
export const BEFORE_TRIP_KEY = "before-trip";

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

export function firstDatedTripDay(days: TripDay[]): string | null {
  const dates = days
    .map((day) => dateKey(day.date))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b));
  return dates[0] ?? null;
}

function timelineGroupKey(
  item: SpendItem,
  days: TripDay[],
  firstTrip: string | null,
): string {
  const when = dateKey(spendWhen(item, days));
  if (!when || (firstTrip && when < firstTrip)) return BEFORE_TRIP_KEY;
  return when;
}

export function timelineGroupLabel(
  group: Pick<TimelineGroup, "key" | "date">,
  locale: Locale = "zh",
): string {
  if (group.key === BEFORE_TRIP_KEY) return t(locale, "budget.beforeTrip");
  return formatTimelineDate(group.date, locale) ?? "—";
}

export function timelineGroups(
  items: SpendItem[],
  days: TripDay[],
  jpyPerRm = JPY_PER_RM,
): TimelineGroup[] {
  const firstTrip = firstDatedTripDay(days);
  const map = new Map<string, SpendItem[]>();
  for (const item of items) {
    const key = timelineGroupKey(item, days, firstTrip);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === BEFORE_TRIP_KEY) return -1;
    if (b === BEFORE_TRIP_KEY) return 1;
    return a.localeCompare(b);
  });

  return keys.map((key) => {
    const groupItems = (map.get(key) ?? []).slice().sort((a, b) => {
      const dateA = dateKey(spendWhen(a, days)) ?? "9999-99-99";
      const dateB = dateKey(spendWhen(b, days)) ?? "9999-99-99";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = formatTime(spendWhen(a, days)) ?? "99:99";
      const timeB = formatTime(spendWhen(b, days)) ?? "99:99";
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return a.name.localeCompare(b.name);
    });
    return {
      key,
      date: key === BEFORE_TRIP_KEY ? null : key,
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

/** Stored `Split with`: empty when the selection covers everyone (so later editors are included). */
export function normalizeSplitWith(selected: string[], people: string[]): string[] {
  const unique = [...new Set(selected.map((name) => name.trim()).filter(Boolean))];
  const coversEveryone =
    people.length > 0 &&
    unique.length === people.length &&
    people.every((name) => unique.includes(name));
  return coversEveryone ? [] : unique;
}

export type SettleBalance = {
  name: string;
  paidRm: number;
  shareRm: number;
  netRm: number;
};

export type SettleTransfer = { from: string; to: string; rm: number };

export type SettleResult = {
  balances: SettleBalance[];
  transfers: SettleTransfer[];
  unassigned: SpendItem[];
};

/**
 * Who owes whom, in RM. Each Actual expense is split equally among `splitWith`
 * (empty = everyone). Transfers greedily pair the largest debtor with the
 * largest creditor, so there are at most n−1 of them.
 */
export function settleUp(
  items: SpendItem[],
  people: string[],
  jpyPerRm = JPY_PER_RM,
): SettleResult {
  const counted = items.filter((item) => item.kind !== "Estimate");
  const unassigned = counted.filter((item) => !item.paidBy);
  const assigned = counted.filter((item) => item.paidBy);
  const everyone =
    people.length > 0
      ? people
      : [...new Set(assigned.map((item) => item.paidBy as string))];

  const order: string[] = [...everyone];
  const paid = new Map<string, number>();
  const share = new Map<string, number>();
  const touch = (name: string) => {
    if (!order.includes(name)) order.push(name);
  };

  for (const item of assigned) {
    const payer = item.paidBy as string;
    const rm = toRm(item.amount, item.currency, jpyPerRm);
    const listed = [...new Set(item.splitWith)];
    const participants = listed.length > 0 ? listed : everyone;
    const split = participants.length > 0 ? participants : [payer];
    touch(payer);
    paid.set(payer, (paid.get(payer) ?? 0) + rm);
    for (const name of split) {
      touch(name);
      share.set(name, (share.get(name) ?? 0) + rm / split.length);
    }
  }

  const balances = order.map((name) => {
    const paidRm = paid.get(name) ?? 0;
    const shareRm = share.get(name) ?? 0;
    return { name, paidRm, shareRm, netRm: paidRm - shareRm };
  });

  const cents = balances.map((row) => ({
    name: row.name,
    cents: Math.round(row.netRm * 100),
  }));
  const creditors = cents.filter((row) => row.cents > 0).sort((a, b) => b.cents - a.cents);
  const debtors = cents.filter((row) => row.cents < 0).sort((a, b) => a.cents - b.cents);
  const transfers: SettleTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]!;
    const debtor = debtors[j]!;
    const amount = Math.min(creditor.cents, -debtor.cents);
    if (amount > 0) {
      transfers.push({ from: debtor.name, to: creditor.name, rm: amount / 100 });
    }
    creditor.cents -= amount;
    debtor.cents += amount;
    if (creditor.cents <= 0) i += 1;
    if (debtor.cents >= 0) j += 1;
  }

  return { balances, transfers, unassigned };
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
