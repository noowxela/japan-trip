import { afterEach, describe, expect, it } from "vitest";
import {
  CLOTHES_VERSION,
  DEFAULT_CLOTHES_EN,
  DEFAULT_CLOTHES_ZH,
  EMPTY_CLOTHES,
  adjustClothesQty,
  clampClothesQty,
  clothesItemName,
  clothesSummary,
  createClothesItem,
  defaultClothesItems,
  deleteClothesItem,
  invalidateClothesMemory,
  parseClothesJson,
  readCachedClothes,
  renameClothesItem,
  serializeClothes,
  upsertClothesItem,
} from "@/lib/clothes";

describe("clampClothesQty", () => {
  it("floors, rejects negatives, and caps at 99", () => {
    expect(clampClothesQty(-3)).toBe(0);
    expect(clampClothesQty(2.9)).toBe(2);
    expect(clampClothesQty(99)).toBe(99);
    expect(clampClothesQty(100)).toBe(99);
    expect(clampClothesQty("4")).toBe(4);
    expect(clampClothesQty("nope")).toBe(0);
    expect(clampClothesQty(null)).toBe(0);
    expect(clampClothesQty(Number.NaN)).toBe(0);
  });
});

describe("parseClothesJson / first-load defaults", () => {
  it("seeds starter rows when the store is missing", () => {
    const zh = parseClothesJson(null, "zh");
    expect(zh.seeded).toBe(true);
    expect(zh.items).toBe(DEFAULT_CLOTHES_ZH);
    expect(zh.items.map((item) => item.name)).toEqual([
      "T恤",
      "裤子",
      "内衣",
      "袜子",
      "外套",
    ]);
    expect(zh.items.every((item) => item.needed === 0 && item.packed === 0)).toBe(
      true,
    );

    const en = parseClothesJson(null, "en");
    expect(en.items).toBe(DEFAULT_CLOTHES_EN);
    expect(en.items.map((item) => item.name)).toEqual([
      "T-shirt",
      "Pants",
      "Underwear",
      "Socks",
      "Jacket",
    ]);
  });

  it("keeps an explicit empty list after the first visit", () => {
    const raw = serializeClothes([]);
    const parsed = JSON.parse(raw) as { v: number; items: unknown[] };
    expect(parsed.v).toBe(CLOTHES_VERSION);
    expect(parseClothesJson(raw)).toEqual({ items: [], seeded: false });
  });

  it("returns [] for invalid data and clamps quantities", () => {
    expect(parseClothesJson("not-json")).toEqual({ items: [], seeded: false });
    expect(parseClothesJson('{"v":99,"items":[]}')).toEqual({
      items: [],
      seeded: false,
    });
    const raw = JSON.stringify({
      v: 1,
      items: [
        { id: "a", name: "  Shirt  ", needed: -2, packed: 3.8, order: 1 },
        { id: "bad" },
        { id: "a", name: "dup", needed: 1, packed: 1, order: 2 },
        { id: "b", name: "Coat", needed: 200, packed: 1, order: 0 },
      ],
    });
    const items = parseClothesJson(raw).items;
    expect(items.map((item) => item.id)).toEqual(["b", "a"]);
    expect(items[0]).toMatchObject({ name: "Coat", needed: 99, packed: 1 });
    expect(items[1]).toMatchObject({ name: "Shirt", needed: 0, packed: 3 });
  });
});

describe("readCachedClothes", () => {
  afterEach(() => {
    invalidateClothesMemory();
  });

  it("returns a stable reference for the same raw input", () => {
    const item = createClothesItem({ name: "Shirt", needed: 2, packed: 1 });
    const raw = serializeClothes([item]);
    const first = readCachedClothes(() => raw);
    const second = readCachedClothes(() => raw);
    expect(first.seeded).toBe(false);
    expect(second.items).toBe(first.items);
  });

  it("returns frozen defaults when the store is missing", () => {
    const first = readCachedClothes(() => null, "zh");
    const second = readCachedClothes(() => null, "zh");
    expect(first.seeded).toBe(true);
    expect(first.items).toBe(DEFAULT_CLOTHES_ZH);
    expect(second.items).toBe(first.items);
  });

  it("returns EMPTY_CLOTHES after the raw value becomes an empty store", () => {
    const item = createClothesItem({ name: "Shirt" });
    let current: string | null = serializeClothes([item]);
    const first = readCachedClothes(() => current);
    current = serializeClothes([]);
    const second = readCachedClothes(() => current);
    expect(second.items).toBe(EMPTY_CLOTHES);
    expect(second.items).not.toBe(first.items);
  });
});

describe("mutators and summary", () => {
  it("adds, renames, adjusts, and deletes", () => {
    let items = defaultClothesItems("zh").slice();
    const extra = createClothesItem({ name: "帽子", needed: 1, order: 10 });
    items = upsertClothesItem(items, extra);
    items = renameClothesItem(items, extra.id, "棒球帽");
    expect(items.find((row) => row.id === extra.id)?.name).toBe("棒球帽");
    items = adjustClothesQty(items, extra.id, "packed", 2);
    expect(items.find((row) => row.id === extra.id)?.packed).toBe(2);
    items = adjustClothesQty(items, extra.id, "packed", -5);
    expect(items.find((row) => row.id === extra.id)?.packed).toBe(0);
    items = deleteClothesItem(items, extra.id);
    expect(items.some((row) => row.id === extra.id)).toBe(false);
  });

  it("clears presetId when a starter row is renamed", () => {
    const items = renameClothesItem(defaultClothesItems("zh"), "preset-tshirt", "白T");
    const row = items.find((item) => item.id === "preset-tshirt");
    expect(row?.name).toBe("白T");
    expect(row?.presetId).toBeUndefined();
  });

  it("summarizes packed vs needed piece counts", () => {
    const items = [
      createClothesItem({ name: "A", needed: 3, packed: 1, order: 0 }),
      createClothesItem({ name: "B", needed: 2, packed: 2, order: 1 }),
      createClothesItem({ name: "C", needed: 0, packed: 1, order: 2 }),
    ];
    expect(clothesSummary(items)).toEqual({
      needed: 5,
      packed: 4,
      remaining: 1,
      complete: 1,
      total: 3,
    });
  });

  it("localizes untouched preset names", () => {
    const tshirt = defaultClothesItems("zh")[0]!;
    expect(clothesItemName(tshirt, "en")).toBe("T-shirt");
    expect(clothesItemName(tshirt, "zh")).toBe("T恤");
  });
});
