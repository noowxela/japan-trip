import type { SpendItem } from "@/lib/types";

export function sumYen(items: SpendItem[], kind?: string) {
  return items
    .filter((item) => (kind ? item.kind === kind : true))
    .reduce((sum, item) => sum + item.amount, 0);
}

export function byDay(items: SpendItem[], dayId: string) {
  return items.filter((item) => item.dayIds.includes(dayId));
}

export function byCategory(items: SpendItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.category ?? "Other";
    map.set(key, (map.get(key) ?? 0) + item.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function moneySummary(items: SpendItem[]) {
  const estimate = sumYen(items, "Estimate");
  const actual = sumYen(items, "Actual");
  return {
    estimate,
    actual,
    remaining: estimate - actual,
  };
}
