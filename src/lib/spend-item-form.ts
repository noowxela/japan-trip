import { dateKey, formatTime } from "@/lib/format";
import type { SpendItem, TripDay } from "@/lib/types";

export type SpendItemFormOverrides = {
  category?: string | null;
  dayDate?: string;
  dayId?: string;
  time?: string | null;
  placeId?: string | null;
};

export function dateForSpendItem(item: SpendItem, days: TripDay[]): string {
  return (
    dateKey(item.start ?? null) ??
    dateKey(days.find((day) => item.dayIds.includes(day.id))?.date ?? null) ??
    ""
  );
}

export function dayIdForDate(days: TripDay[], date: string): string {
  if (!date) return "";
  return days.find((day) => dateKey(day.date) === date)?.id ?? "";
}

export function isBeforeTripDate(date: string, days: TripDay[]): boolean {
  if (!date) return true;
  const first = days
    .map((day) => dateKey(day.date))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b))[0];
  return !first || date < first;
}

/** Build the FormData updateSpend / addSpend already accept. */
export function formDataFromSpendItem(
  item: SpendItem,
  days: TripDay[],
  overrides: SpendItemFormOverrides = {},
): FormData {
  const movingDate = overrides.dayDate !== undefined;
  const dayDate = movingDate
    ? (overrides.dayDate ?? "")
    : dateForSpendItem(item, days);
  const dayId =
    overrides.dayId ??
    (movingDate || dayDate ? dayIdForDate(days, dayDate) : (item.dayIds[0] ?? ""));
  const time =
    overrides.time !== undefined ? overrides.time : formatTime(item.start);
  const category =
    overrides.category !== undefined ? overrides.category : item.category;
  let placeId =
    overrides.placeId !== undefined ? overrides.placeId : (item.placeId ?? "");
  if (category !== "Food") placeId = "";

  const formData = new FormData();
  formData.set("id", item.id);
  formData.set("name", item.name);
  formData.set("amount", String(item.amount));
  formData.set("currency", item.currency);
  formData.set("kind", item.kind ?? "Actual");
  formData.set("category", category ?? "");
  formData.set("notes", item.notes ?? "");
  formData.set("dayId", dayId);
  if (dayDate) formData.set("dayDate", dayDate);
  if (time) formData.set("time", time);
  formData.set("paidBy", item.paidBy ?? "");
  for (const name of item.splitWith ?? []) formData.append("splitWith", name);
  if (placeId) formData.set("placeId", placeId);
  return formData;
}

export function formDataForDuplicateSpend(
  item: SpendItem,
  days: TripDay[],
): FormData {
  const formData = formDataFromSpendItem(item, days);
  formData.delete("id");
  return formData;
}
