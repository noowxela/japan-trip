import type { Locale } from "@/lib/i18n/dictionaries";

export const CLOTHES_STORAGE_KEY = "japan-trip:clothes-v1";
export const CLOTHES_VERSION = 1 as const;
export const CLOTHES_CHANGED_EVENT = "japan-trip-clothes";
export const CLOTHES_QTY_MAX = 99;

export const CLOTHES_PRESET_IDS = [
  "tshirt",
  "pants",
  "underwear",
  "socks",
  "jacket",
] as const;

export type ClothesPresetId = (typeof CLOTHES_PRESET_IDS)[number];

export type ClothesItem = {
  id: string;
  name: string;
  needed: number;
  packed: number;
  order: number;
  presetId?: ClothesPresetId;
};

export type ClothesStore = {
  v: typeof CLOTHES_VERSION;
  items: ClothesItem[];
};

const PRESET_NAMES: Record<ClothesPresetId, { zh: string; en: string }> = {
  tshirt: { zh: "T恤", en: "T-shirt" },
  pants: { zh: "裤子", en: "Pants" },
  underwear: { zh: "内衣", en: "Underwear" },
  socks: { zh: "袜子", en: "Socks" },
  jacket: { zh: "外套", en: "Jacket" },
};

export function isClothesPresetId(value: unknown): value is ClothesPresetId {
  return (
    typeof value === "string" &&
    (CLOTHES_PRESET_IDS as readonly string[]).includes(value)
  );
}

export function presetClothesName(
  presetId: ClothesPresetId,
  locale: Locale = "zh",
): string {
  return PRESET_NAMES[presetId][locale];
}

/** Display name: i18n for untouched presets, otherwise the stored name. */
export function clothesItemName(item: ClothesItem, locale: Locale): string {
  if (item.presetId && isClothesPresetId(item.presetId)) {
    const defaults = PRESET_NAMES[item.presetId];
    if (item.name === defaults.zh || item.name === defaults.en) {
      return defaults[locale];
    }
  }
  return item.name;
}

export function clampClothesQty(value: unknown): number {
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && value.trim()) {
    n = Number(value);
  } else {
    return 0;
  }
  if (!Number.isFinite(n)) return 0;
  return Math.min(CLOTHES_QTY_MAX, Math.max(0, Math.floor(n)));
}

function newClothesId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `clothes-${crypto.randomUUID()}`;
  }
  return `clothes-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildDefaultClothes(locale: Locale): ClothesItem[] {
  return CLOTHES_PRESET_IDS.map((presetId, index) => ({
    id: `preset-${presetId}`,
    name: presetClothesName(presetId, locale),
    needed: 0,
    packed: 0,
    order: index,
    presetId,
  }));
}

export const DEFAULT_CLOTHES_ZH: ClothesItem[] = buildDefaultClothes("zh");
export const DEFAULT_CLOTHES_EN: ClothesItem[] = buildDefaultClothes("en");
Object.freeze(DEFAULT_CLOTHES_ZH);
Object.freeze(DEFAULT_CLOTHES_EN);

export function defaultClothesItems(locale: Locale = "zh"): ClothesItem[] {
  return locale === "en" ? DEFAULT_CLOTHES_EN : DEFAULT_CLOTHES_ZH;
}

function isClothesItem(value: unknown): value is ClothesItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    typeof record.needed === "number" &&
    typeof record.packed === "number"
  );
}

export function parseClothesJson(
  raw: string | null | undefined,
  locale: Locale = "zh",
): { items: ClothesItem[]; seeded: boolean } {
  if (!raw?.trim()) {
    return { items: defaultClothesItems(locale), seeded: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], seeded: false };
  }
  if (!parsed || typeof parsed !== "object") {
    return { items: [], seeded: false };
  }
  const record = parsed as Record<string, unknown>;
  if (record.v !== CLOTHES_VERSION) {
    return { items: [], seeded: false };
  }
  if (!Array.isArray(record.items)) {
    return { items: [], seeded: false };
  }
  const out: ClothesItem[] = [];
  const seen = new Set<string>();
  for (const item of record.items) {
    if (!isClothesItem(item)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const presetId = isClothesPresetId(item.presetId) ? item.presetId : undefined;
    const order =
      typeof item.order === "number" && Number.isFinite(item.order)
        ? item.order
        : out.length;
    out.push({
      id: item.id,
      name: item.name.trim(),
      needed: clampClothesQty(item.needed),
      packed: clampClothesQty(item.packed),
      order,
      ...(presetId ? { presetId } : {}),
    });
  }
  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return { items: out, seeded: false };
}

export function serializeClothes(items: readonly ClothesItem[]): string {
  const store: ClothesStore = {
    v: CLOTHES_VERSION,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      needed: item.needed,
      packed: item.packed,
      order: item.order,
      ...(item.presetId ? { presetId: item.presetId } : {}),
    })),
  };
  return JSON.stringify(store);
}

export function createClothesItem(input: {
  name: string;
  needed?: number;
  packed?: number;
  order?: number;
}): ClothesItem {
  return {
    id: newClothesId(),
    name: input.name.trim(),
    needed: clampClothesQty(input.needed),
    packed: clampClothesQty(input.packed),
    order: input.order ?? 0,
  };
}

export function upsertClothesItem(
  items: readonly ClothesItem[],
  item: ClothesItem,
): ClothesItem[] {
  const nextItem: ClothesItem = {
    ...item,
    name: item.name.trim(),
    needed: clampClothesQty(item.needed),
    packed: clampClothesQty(item.packed),
  };
  const idx = items.findIndex((row) => row.id === nextItem.id);
  if (idx < 0) {
    const order =
      nextItem.order ||
      items.reduce((max, row) => Math.max(max, row.order), -1) + 1;
    return [...items, { ...nextItem, order }];
  }
  const next = items.slice();
  next[idx] = { ...items[idx], ...nextItem, id: items[idx].id };
  return next;
}

export function renameClothesItem(
  items: readonly ClothesItem[],
  id: string,
  name: string,
): ClothesItem[] {
  const trimmed = name.trim();
  if (!trimmed) return items.slice();
  return items.map((item) => {
    if (item.id !== id) return item;
    const next: ClothesItem = { ...item, name: trimmed };
    if (item.presetId) {
      const defaults = PRESET_NAMES[item.presetId];
      if (trimmed !== defaults.zh && trimmed !== defaults.en) {
        delete next.presetId;
      }
    }
    return next;
  });
}

export function adjustClothesQty(
  items: readonly ClothesItem[],
  id: string,
  field: "needed" | "packed",
  delta: number,
): ClothesItem[] {
  return items.map((item) =>
    item.id === id
      ? { ...item, [field]: clampClothesQty(item[field] + delta) }
      : item,
  );
}

export function setClothesQty(
  items: readonly ClothesItem[],
  id: string,
  field: "needed" | "packed",
  value: number,
): ClothesItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, [field]: clampClothesQty(value) } : item,
  );
}

export function deleteClothesItem(
  items: readonly ClothesItem[],
  id: string,
): ClothesItem[] {
  return items.filter((item) => item.id !== id);
}

export type ClothesSummary = {
  needed: number;
  packed: number;
  remaining: number;
  complete: number;
  total: number;
};

export function clothesSummary(
  items: readonly ClothesItem[],
): ClothesSummary {
  let needed = 0;
  let packed = 0;
  let complete = 0;
  for (const item of items) {
    needed += item.needed;
    packed += item.packed;
    if (item.needed > 0 && item.packed >= item.needed) complete += 1;
  }
  return {
    needed,
    packed,
    remaining: Math.max(0, needed - packed),
    complete,
    total: items.length,
  };
}

/** Stable empty list for useSyncExternalStore (React #185). */
export const EMPTY_CLOTHES: ClothesItem[] = [];
Object.freeze(EMPTY_CLOTHES);

export type ClothesSnapshot = {
  items: ClothesItem[];
  seeded: boolean;
};

/** Seeded snapshots reused for SSR and a missing store (React #185). */
export const SEEDED_CLOTHES_ZH: ClothesSnapshot = Object.freeze({
  items: DEFAULT_CLOTHES_ZH,
  seeded: true,
});
export const SEEDED_CLOTHES_EN: ClothesSnapshot = Object.freeze({
  items: DEFAULT_CLOTHES_EN,
  seeded: true,
});

function seededClothesSnapshot(locale: Locale): ClothesSnapshot {
  return locale === "en" ? SEEDED_CLOTHES_EN : SEEDED_CLOTHES_ZH;
}

const EMPTY_CLOTHES_SNAPSHOT: ClothesSnapshot = Object.freeze({
  items: EMPTY_CLOTHES,
  seeded: false,
});

let clothesMemoryRaw: string | null | undefined = undefined;
let clothesMemoryLocale: Locale | undefined = undefined;
let clothesMemorySnapshot: ClothesSnapshot = EMPTY_CLOTHES_SNAPSHOT;

export function invalidateClothesMemory() {
  clothesMemoryRaw = undefined;
  clothesMemoryLocale = undefined;
  clothesMemorySnapshot = EMPTY_CLOTHES_SNAPSHOT;
}

export function readCachedClothes(
  getRaw: () => string | null,
  locale: Locale = "zh",
): ClothesSnapshot {
  const raw = getRaw();
  // Locale only affects seeded defaults. A persisted store is locale-agnostic,
  // so skip the locale check when the cached snapshot is not seeded.
  if (
    raw === clothesMemoryRaw &&
    clothesMemoryRaw !== undefined &&
    (clothesMemoryLocale === locale || !clothesMemorySnapshot.seeded)
  ) {
    return clothesMemorySnapshot;
  }
  const parsed = parseClothesJson(raw, locale);
  clothesMemoryRaw = raw;
  clothesMemoryLocale = locale;
  if (parsed.seeded) {
    clothesMemorySnapshot = seededClothesSnapshot(locale);
    return clothesMemorySnapshot;
  }
  clothesMemorySnapshot =
    parsed.items.length === 0
      ? EMPTY_CLOTHES_SNAPSHOT
      : { items: parsed.items, seeded: false };
  return clothesMemorySnapshot;
}

/** SSR-safe read. Missing store returns locale defaults without writing. */
export function readClothes(locale: Locale = "zh"): ClothesSnapshot {
  if (typeof window === "undefined") {
    return seededClothesSnapshot(locale);
  }
  try {
    return readCachedClothes(
      () => window.localStorage.getItem(CLOTHES_STORAGE_KEY),
      locale,
    );
  } catch {
    return seededClothesSnapshot(locale);
  }
}

export function writeClothes(items: readonly ClothesItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = serializeClothes(items);
    window.localStorage.setItem(CLOTHES_STORAGE_KEY, raw);
    clothesMemoryRaw = raw;
    clothesMemoryLocale = undefined;
    clothesMemorySnapshot =
      items.length === 0
        ? EMPTY_CLOTHES_SNAPSHOT
        : { items: items.slice(), seeded: false };
    window.dispatchEvent(new Event(CLOTHES_CHANGED_EVENT));
  } catch {
    // quota / private mode — ignore
  }
}

/** Persist first-visit defaults once, so deleting every row stays empty. */
export function seedClothesIfMissing(locale: Locale): ClothesItem[] {
  const current = readClothes(locale);
  if (!current.seeded) return current.items;
  if (typeof window === "undefined") return current.items;
  try {
    if (window.localStorage.getItem(CLOTHES_STORAGE_KEY)) {
      return current.items;
    }
  } catch {
    return current.items;
  }
  writeClothes(current.items);
  return current.items;
}
