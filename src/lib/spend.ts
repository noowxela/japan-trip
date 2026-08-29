import {
  DEFAULT_SPEND_CURRENCY,
  JPY_PER_RM,
  type SpendCurrency,
  type SpendItem,
} from "@/lib/types";

export function parseSpendCurrency(value: string | null): SpendCurrency {
  return value === "Yen" ? "Yen" : DEFAULT_SPEND_CURRENCY;
}

export function toRm(amount: number, currency: SpendCurrency) {
  return currency === "Yen" ? amount / JPY_PER_RM : amount;
}

export function sumRm(items: SpendItem[], kind?: string) {
  return items
    .filter((item) => (kind ? item.kind === kind : true))
    .reduce((sum, item) => sum + toRm(item.amount, item.currency), 0);
}

export function byDay(items: SpendItem[], dayId: string) {
  return items.filter((item) => item.dayIds.includes(dayId));
}

export function byCategory(items: SpendItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.category ?? "Other";
    map.set(key, (map.get(key) ?? 0) + toRm(item.amount, item.currency));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function moneySummary(items: SpendItem[]) {
  const estimate = sumRm(items, "Estimate");
  const actual = sumRm(items, "Actual");
  return {
    estimate,
    actual,
    remaining: estimate - actual,
  };
}
