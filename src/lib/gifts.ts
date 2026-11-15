import type { SpendCurrency, SpendItem } from "@/lib/types";
import { parseSpendCurrency } from "@/lib/spend";

export const GIFTS_STORAGE_KEY = "japan-trip:gifts-v1";
export const GIFT_RECIPIENTS_STORAGE_KEY = "japan-trip:gift-recipients-v1";
export const GIFTS_VERSION = 1 as const;
export const GIFTS_CHANGED_EVENT = "japan-trip-gifts";
export const GIFT_RECIPIENTS_CHANGED_EVENT = "japan-trip-gift-recipients";
export const MAX_RECENT_RECIPIENTS = 8;

export type GiftItem = {
  id: string;
  name: string;
  forSelf: boolean;
  recipient: string;
  amount?: number;
  currency?: SpendCurrency;
  notes?: string;
  bought: boolean;
  spendId?: string;
  createdAt: string;
  updatedAt?: string;
};

export type GiftTab = "all" | "others" | "self";

export type GiftsStore = {
  v: typeof GIFTS_VERSION;
  items: GiftItem[];
};

export const EMPTY_GIFTS: GiftItem[] = [];
Object.freeze(EMPTY_GIFTS);

export const EMPTY_RECIPIENTS: string[] = [];
Object.freeze(EMPTY_RECIPIENTS);

let recipientsMemoryRaw: string | null | undefined;
let recipientsMemory: string[] = EMPTY_RECIPIENTS;

function setRecipientsMemory(raw: string | null, names: string[]) {
  recipientsMemoryRaw = raw;
  recipientsMemory = names.length === 0 ? EMPTY_RECIPIENTS : names;
}

export function subscribeRecentRecipients(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GIFT_RECIPIENTS_STORAGE_KEY) {
      recipientsMemoryRaw = undefined;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GIFT_RECIPIENTS_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GIFT_RECIPIENTS_CHANGED_EVENT, onChange);
  };
}

function newGiftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `gift-${crypto.randomUUID()}`;
  }
  return `gift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function optionalAmount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isGiftItem(value: unknown): value is GiftItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    typeof record.forSelf === "boolean" &&
    typeof record.recipient === "string" &&
    typeof record.bought === "boolean" &&
    typeof record.createdAt === "string"
  );
}

export function parseGiftsJson(
  raw: string | null | undefined,
): GiftItem[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const record = parsed as Record<string, unknown>;
  if (record.v !== GIFTS_VERSION || !Array.isArray(record.items)) return [];
  const out: GiftItem[] = [];
  const seen = new Set<string>();
  for (const item of record.items) {
    if (!isGiftItem(item)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const amount = optionalAmount(item.amount);
    const currencyRaw = item.currency;
    const currency =
      currencyRaw === "Yen" || currencyRaw === "RM"
        ? currencyRaw
        : amount != null
          ? parseSpendCurrency(String(currencyRaw ?? ""))
          : undefined;
    const notes = optionalText(item.notes);
    const spendId = optionalText(item.spendId);
    const updatedAt = optionalText(item.updatedAt);
    const forSelf = item.forSelf;
    out.push({
      id: item.id,
      name: item.name.trim(),
      forSelf,
      recipient: forSelf ? "" : item.recipient.trim(),
      ...(amount != null ? { amount } : {}),
      ...(currency ? { currency } : {}),
      ...(notes ? { notes } : {}),
      bought: item.bought,
      ...(spendId ? { spendId } : {}),
      createdAt: item.createdAt,
      ...(updatedAt ? { updatedAt } : {}),
    });
  }
  out.sort((a, b) => {
    const aTime = a.createdAt;
    const bTime = b.createdAt;
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return a.name.localeCompare(b.name);
  });
  return out;
}

export function serializeGifts(items: readonly GiftItem[]): string {
  const store: GiftsStore = {
    v: GIFTS_VERSION,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      forSelf: item.forSelf,
      recipient: item.forSelf ? "" : item.recipient,
      ...(item.amount != null ? { amount: item.amount } : {}),
      ...(item.currency ? { currency: item.currency } : {}),
      ...(item.notes ? { notes: item.notes } : {}),
      bought: item.bought,
      ...(item.spendId ? { spendId: item.spendId } : {}),
      createdAt: item.createdAt,
      ...(item.updatedAt ? { updatedAt: item.updatedAt } : {}),
    })),
  };
  return JSON.stringify(store);
}

export function parseRecentRecipients(
  raw: string | null | undefined,
): string[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of parsed) {
    if (typeof value !== "string") continue;
    const name = value.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_RECENT_RECIPIENTS) break;
  }
  return out;
}

export function rememberRecipient(
  names: readonly string[],
  name: string,
): string[] {
  const trimmed = name.trim();
  if (!trimmed) return names.slice();
  const next = [
    trimmed,
    ...names.filter((row) => row.toLowerCase() !== trimmed.toLowerCase()),
  ];
  return next.slice(0, MAX_RECENT_RECIPIENTS);
}

export function createGift(input: {
  name: string;
  forSelf: boolean;
  recipient?: string;
  amount?: number;
  currency?: SpendCurrency;
  notes?: string;
  bought?: boolean;
  spendId?: string;
  createdAt?: string;
}): GiftItem {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const amount =
    input.amount != null && Number.isFinite(input.amount)
      ? input.amount
      : undefined;
  const notes = input.notes?.trim() || undefined;
  const spendId = input.spendId?.trim() || undefined;
  return {
    id: newGiftId(),
    name: input.name.trim(),
    forSelf: input.forSelf,
    recipient: input.forSelf ? "" : (input.recipient ?? "").trim(),
    ...(amount != null ? { amount } : {}),
    ...(input.currency && amount != null ? { currency: input.currency } : {}),
    ...(notes ? { notes } : {}),
    bought: input.bought ?? false,
    ...(spendId ? { spendId } : {}),
    createdAt,
  };
}

export function upsertGift(
  items: readonly GiftItem[],
  gift: GiftItem,
): GiftItem[] {
  const nextGift: GiftItem = {
    ...gift,
    name: gift.name.trim(),
    recipient: gift.forSelf ? "" : gift.recipient.trim(),
  };
  const idx = items.findIndex((row) => row.id === nextGift.id);
  if (idx < 0) return [nextGift, ...items];
  const next = items.slice();
  next[idx] = { ...items[idx], ...nextGift, id: items[idx].id };
  return next;
}

export function deleteGift(
  items: readonly GiftItem[],
  id: string,
): GiftItem[] {
  return items.filter((item) => item.id !== id);
}

export function giftsForTab(
  items: readonly GiftItem[],
  tab: GiftTab,
): GiftItem[] {
  if (tab === "all") return items.slice();
  return items.filter((item) => (tab === "self" ? item.forSelf : !item.forSelf));
}

export function findGiftBySpendId(
  items: readonly GiftItem[],
  spendId: string | null | undefined,
): GiftItem | undefined {
  if (!spendId) return undefined;
  return items.find((item) => item.spendId === spendId);
}

export function unlinkGiftFromSpend(
  items: readonly GiftItem[],
  spendId: string,
  now = new Date().toISOString(),
): GiftItem[] {
  if (!spendId) return items.slice();
  let changed = false;
  const next = items.map((item) => {
    if (item.spendId !== spendId) return item;
    changed = true;
    const { spendId: _removed, ...rest } = item;
    return { ...rest, updatedAt: now };
  });
  return changed ? next : items.slice();
}

export function linkGiftToSpend(
  items: readonly GiftItem[],
  giftId: string,
  spend: Pick<SpendItem, "id" | "name" | "amount" | "currency">,
  now = new Date().toISOString(),
): GiftItem[] {
  const cleared = items.map((item) => {
    if (item.id === giftId || item.spendId !== spend.id) return item;
    const { spendId: _removed, ...rest } = item;
    return { ...rest, updatedAt: now };
  });
  return cleared.map((item) =>
    item.id === giftId
      ? {
          ...item,
          name: item.name.trim() || spend.name,
          amount: spend.amount,
          currency: spend.currency,
          spendId: spend.id,
          bought: true,
          updatedAt: now,
        }
      : item,
  );
}

export type SpendGiftFlagInput = {
  gifts: readonly GiftItem[];
  spendId: string | undefined;
  name: string;
  amount: number;
  currency: SpendCurrency;
  flagged: boolean;
  forSelf: boolean;
  recipient: string;
  /** When logging a spend from an existing gift row, update that row. */
  giftId?: string;
  now?: string;
};

/**
 * Create or update a gift when a spend is flagged as 手信; unlink (do not
 * delete) when the flag is cleared. Money stays on the spend — this only
 * maintains inventory / recipient.
 */
export function applySpendGiftFlag(input: SpendGiftFlagInput): GiftItem[] {
  const now = input.now ?? new Date().toISOString();
  const name = input.name.trim();
  const recipient = input.forSelf ? "" : input.recipient.trim();

  if (!input.flagged) {
    if (input.spendId) return unlinkGiftFromSpend(input.gifts, input.spendId, now);
    return input.gifts.slice();
  }

  const linked = input.spendId
    ? findGiftBySpendId(input.gifts, input.spendId)
    : undefined;
  const existing =
    (input.giftId
      ? input.gifts.find((item) => item.id === input.giftId)
      : undefined) ?? linked;

  const patch = {
    name: name || existing?.name || "",
    forSelf: input.forSelf,
    recipient,
    amount: input.amount,
    currency: input.currency,
    bought: true,
    ...(input.spendId ? { spendId: input.spendId } : {}),
    updatedAt: now,
  };

  if (existing) {
    let items = input.gifts.map((item) =>
      item.id === existing.id ? { ...item, ...patch, id: existing.id } : item,
    );
    if (input.spendId) {
      items = items.map((item) => {
        if (item.id === existing.id || item.spendId !== input.spendId) {
          return item;
        }
        const { spendId: _removed, ...rest } = item;
        return { ...rest, updatedAt: now };
      });
    }
    return items;
  }

  if (!name) return input.gifts.slice();
  return [
    createGift({
      name,
      forSelf: input.forSelf,
      recipient,
      amount: input.amount,
      currency: input.currency,
      bought: true,
      spendId: input.spendId,
      createdAt: now,
    }),
    ...input.gifts,
  ];
}

/** If the linked spend is gone, keep the gift and treat it as unlinked. */
export function resolveLinkedSpend(
  gift: Pick<GiftItem, "spendId">,
  spends: readonly Pick<SpendItem, "id">[],
): string | undefined {
  if (!gift.spendId) return undefined;
  return spends.some((spend) => spend.id === gift.spendId)
    ? gift.spendId
    : undefined;
}

export function findSpendForGift(
  gift: Pick<GiftItem, "spendId">,
  spends: readonly SpendItem[],
): SpendItem | undefined {
  const id = resolveLinkedSpend(gift, spends);
  if (!id) return undefined;
  return spends.find((spend) => spend.id === id);
}

export type GiftMoney =
  | { source: "spend"; amount: number; currency: SpendCurrency; spendId: string }
  | { source: "note"; amount: number; currency: SpendCurrency };

/**
 * Amount to show on a gift. Linked spend wins so the gift list never
 * double-counts money already on the expense list.
 */
export function giftMoney(
  gift: Pick<GiftItem, "amount" | "currency" | "spendId">,
  spends: readonly SpendItem[],
): GiftMoney | null {
  const spend = findSpendForGift(gift, spends);
  if (spend) {
    return {
      source: "spend",
      amount: spend.amount,
      currency: spend.currency,
      spendId: spend.id,
    };
  }
  if (gift.amount != null && Number.isFinite(gift.amount) && gift.currency) {
    return { source: "note", amount: gift.amount, currency: gift.currency };
  }
  return null;
}

/** Gift optional prices must not be added on top of linked spend amounts. */
export function giftInventoryAmount(
  gift: Pick<GiftItem, "amount" | "currency" | "spendId">,
  spends: readonly SpendItem[],
): GiftMoney | null {
  return giftMoney(gift, spends);
}

const SHOP_FIRST = new Set(["Shop", "Other"]);

export function spendsForGiftPicker(
  spends: readonly SpendItem[],
): SpendItem[] {
  return spends.slice().sort((a, b) => {
    const aPref = a.category && SHOP_FIRST.has(a.category) ? 0 : 1;
    const bPref = b.category && SHOP_FIRST.has(b.category) ? 0 : 1;
    if (aPref !== bPref) return aPref - bPref;
    const aStart = a.start ?? "";
    const bStart = b.start ?? "";
    if (aStart !== bStart) return bStart.localeCompare(aStart);
    return a.name.localeCompare(b.name);
  });
}

let giftsMemoryRaw: string | null | undefined = undefined;
let giftsMemoryItems: GiftItem[] = EMPTY_GIFTS;

export function invalidateGiftsMemory() {
  giftsMemoryRaw = undefined;
  giftsMemoryItems = EMPTY_GIFTS;
}

export function readCachedGifts(getRaw: () => string | null): GiftItem[] {
  const raw = getRaw();
  if (raw === giftsMemoryRaw) return giftsMemoryItems;
  if (!raw?.trim()) {
    giftsMemoryRaw = raw;
    giftsMemoryItems = EMPTY_GIFTS;
    return giftsMemoryItems;
  }
  const parsed = parseGiftsJson(raw);
  giftsMemoryRaw = raw;
  giftsMemoryItems = parsed.length === 0 ? EMPTY_GIFTS : parsed;
  return giftsMemoryItems;
}

export function readGifts(): GiftItem[] {
  if (typeof window === "undefined") return EMPTY_GIFTS;
  try {
    return readCachedGifts(() => window.localStorage.getItem(GIFTS_STORAGE_KEY));
  } catch {
    return EMPTY_GIFTS;
  }
}

export function writeGifts(items: readonly GiftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = serializeGifts(items);
    window.localStorage.setItem(GIFTS_STORAGE_KEY, raw);
    giftsMemoryRaw = raw;
    giftsMemoryItems = items.length === 0 ? EMPTY_GIFTS : items.slice();
    window.dispatchEvent(new Event(GIFTS_CHANGED_EVENT));
  } catch {
    // quota / private mode — ignore
  }
}

export function readRecentRecipients(): string[] {
  if (typeof window === "undefined") return EMPTY_RECIPIENTS;
  try {
    const raw = window.localStorage.getItem(GIFT_RECIPIENTS_STORAGE_KEY);
    if (raw === recipientsMemoryRaw) return recipientsMemory;
    const parsed = parseRecentRecipients(raw);
    const names = parsed.length === 0 ? EMPTY_RECIPIENTS : parsed;
    setRecipientsMemory(raw, names);
    return recipientsMemory;
  } catch {
    return EMPTY_RECIPIENTS;
  }
}

export function writeRecentRecipients(names: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = names.slice(0, MAX_RECENT_RECIPIENTS);
    const raw = JSON.stringify(trimmed);
    window.localStorage.setItem(GIFT_RECIPIENTS_STORAGE_KEY, raw);
    setRecipientsMemory(raw, trimmed);
    window.dispatchEvent(new Event(GIFT_RECIPIENTS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function rememberRecipientNow(name: string): string[] {
  const next = rememberRecipient(readRecentRecipients(), name);
  writeRecentRecipients(next);
  return next;
}
