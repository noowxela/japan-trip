import { dateKey } from "@/lib/format";
import { isStayCheckoutDay, staysForOverviewDate } from "@/lib/trip-core";
import type { Stay } from "@/lib/types";

export const CHECKED_OUT_STAYS_STORAGE_KEY = "japan-trip:checked-out-stays-v1";
export const CHECKED_OUT_STAYS_VERSION = 1 as const;
export const CHECKED_OUT_STAYS_CHANGED_EVENT = "japan-trip-checked-out-stays";

export type CheckedOutStay = {
  stayId: string;
  checkOutDate: string;
};

export type CheckedOutStaysStore = {
  v: typeof CHECKED_OUT_STAYS_VERSION;
  items: CheckedOutStay[];
};

export const EMPTY_CHECKED_OUT_STAYS: CheckedOutStay[] = [];
Object.freeze(EMPTY_CHECKED_OUT_STAYS);

function isCheckedOutStay(value: unknown): value is CheckedOutStay {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.stayId === "string" &&
    record.stayId.length > 0 &&
    typeof record.checkOutDate === "string" &&
    record.checkOutDate.length >= 10
  );
}

export function parseCheckedOutStaysJson(
  raw: string | null | undefined,
): CheckedOutStay[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const record = parsed as Record<string, unknown>;
  if (record.v !== CHECKED_OUT_STAYS_VERSION || !Array.isArray(record.items)) {
    return [];
  }
  const out: CheckedOutStay[] = [];
  const seen = new Set<string>();
  for (const item of record.items) {
    if (!isCheckedOutStay(item)) continue;
    const checkOutDate = dateKey(item.checkOutDate);
    if (!checkOutDate) continue;
    const key = `${item.stayId}:${checkOutDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ stayId: item.stayId, checkOutDate });
  }
  return out;
}

export function serializeCheckedOutStays(
  items: readonly CheckedOutStay[],
): string {
  const store: CheckedOutStaysStore = {
    v: CHECKED_OUT_STAYS_VERSION,
    items: items.map((item) => ({
      stayId: item.stayId,
      checkOutDate: item.checkOutDate,
    })),
  };
  return JSON.stringify(store);
}

export function isStayMarkedCheckedOut(
  items: readonly CheckedOutStay[],
  stayId: string,
  checkOutDate: string | null,
): boolean {
  const day = dateKey(checkOutDate);
  if (!stayId || !day) return false;
  return items.some((item) => item.stayId === stayId && item.checkOutDate === day);
}

/** Idempotent: marking the same stay + date twice leaves one record. */
export function markStayCheckedOut(
  items: readonly CheckedOutStay[],
  stayId: string,
  checkOutDate: string | null,
): CheckedOutStay[] {
  const day = dateKey(checkOutDate);
  if (!stayId || !day) return items.slice();
  if (isStayMarkedCheckedOut(items, stayId, day)) return items.slice();
  return [...items, { stayId, checkOutDate: day }];
}

export function unmarkStayCheckedOut(
  items: readonly CheckedOutStay[],
  stayId: string,
  checkOutDate: string | null,
): CheckedOutStay[] {
  const day = dateKey(checkOutDate);
  if (!stayId || !day) return items.slice();
  return items.filter(
    (item) => !(item.stayId === stayId && item.checkOutDate === day),
  );
}

/**
 * Overview lodging: include checkout-day stays, then drop ones already
 * marked checked out for that date.
 */
export function activeOverviewStays(
  stays: readonly Stay[],
  date: string | null,
  checkedOut: readonly CheckedOutStay[],
): Stay[] {
  return staysForOverviewDate(stays, date).filter((stay) => {
    if (!isStayCheckoutDay(stay, date)) return true;
    return !isStayMarkedCheckedOut(checkedOut, stay.id, stay.checkOut);
  });
}

export function checkedOutOverviewStays(
  stays: readonly Stay[],
  date: string | null,
  checkedOut: readonly CheckedOutStay[],
): Stay[] {
  return staysForOverviewDate(stays, date).filter((stay) => {
    if (!isStayCheckoutDay(stay, date)) return false;
    return isStayMarkedCheckedOut(checkedOut, stay.id, stay.checkOut);
  });
}

let memoryRaw: string | null | undefined = undefined;
let memoryItems: CheckedOutStay[] = EMPTY_CHECKED_OUT_STAYS;

export function invalidateCheckedOutStaysMemory() {
  memoryRaw = undefined;
  memoryItems = EMPTY_CHECKED_OUT_STAYS;
}

export function readCachedCheckedOutStays(
  getRaw: () => string | null,
): CheckedOutStay[] {
  const raw = getRaw();
  if (raw === memoryRaw) return memoryItems;
  if (!raw?.trim()) {
    memoryRaw = raw;
    memoryItems = EMPTY_CHECKED_OUT_STAYS;
    return memoryItems;
  }
  const parsed = parseCheckedOutStaysJson(raw);
  memoryRaw = raw;
  memoryItems = parsed.length === 0 ? EMPTY_CHECKED_OUT_STAYS : parsed;
  return memoryItems;
}

export function readCheckedOutStays(): CheckedOutStay[] {
  if (typeof window === "undefined") return EMPTY_CHECKED_OUT_STAYS;
  try {
    return readCachedCheckedOutStays(() =>
      window.localStorage.getItem(CHECKED_OUT_STAYS_STORAGE_KEY),
    );
  } catch {
    return EMPTY_CHECKED_OUT_STAYS;
  }
}

export function writeCheckedOutStays(items: readonly CheckedOutStay[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = serializeCheckedOutStays(items);
    window.localStorage.setItem(CHECKED_OUT_STAYS_STORAGE_KEY, raw);
    memoryRaw = raw;
    memoryItems = items.length === 0 ? EMPTY_CHECKED_OUT_STAYS : items.slice();
    window.dispatchEvent(new Event(CHECKED_OUT_STAYS_CHANGED_EVENT));
  } catch {
    // quota / private mode — ignore
  }
}
