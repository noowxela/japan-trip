import { afterEach, describe, expect, it } from "vitest";
import type { SpendItem } from "@/lib/types";
import {
  EMPTY_GIFTS,
  GIFTS_VERSION,
  applySpendGiftFlag,
  createGift,
  deleteGift,
  findGiftBySpendId,
  findSpendForGift,
  giftMoney,
  giftsForTab,
  invalidateGiftsMemory,
  linkGiftToSpend,
  parseGiftsJson,
  parseRecentRecipients,
  readCachedGifts,
  rememberRecipient,
  resolveLinkedSpend,
  serializeGifts,
  spendsForGiftPicker,
  unlinkGiftFromSpend,
  upsertGift,
} from "@/lib/gifts";

function spend(
  id: string,
  opts: Partial<SpendItem> = {},
): SpendItem {
  return {
    id,
    name: opts.name ?? "Gift shop",
    amount: opts.amount ?? 1200,
    currency: opts.currency ?? "Yen",
    kind: "Actual",
    category: opts.category ?? "Shop",
    notes: "",
    dayIds: opts.dayIds ?? [],
    start: opts.start ?? "2026-11-10T15:00:00+09:00",
    paidBy: null,
    splitWith: [],
    placeId: null,
  };
}

describe("parseGiftsJson / serialize", () => {
  it("returns [] for empty or invalid", () => {
    expect(parseGiftsJson(null)).toEqual([]);
    expect(parseGiftsJson("")).toEqual([]);
    expect(parseGiftsJson("not-json")).toEqual([]);
    expect(parseGiftsJson("{}")).toEqual([]);
    expect(parseGiftsJson('{"v":99,"items":[]}')).toEqual([]);
  });

  it("round-trips a valid store and skips bad/duplicate rows", () => {
    const gift = createGift({
      name: "KitKat",
      forSelf: false,
      recipient: "Mum",
      amount: 800,
      currency: "Yen",
      bought: true,
      createdAt: "2026-11-10T01:00:00.000Z",
    });
    const raw = serializeGifts([gift]);
    expect(JSON.parse(raw).v).toBe(GIFTS_VERSION);
    expect(parseGiftsJson(raw)).toEqual([gift]);

    const messy = JSON.stringify({
      v: 1,
      items: [
        {
          id: "gift-a",
          name: "Tea",
          forSelf: true,
          recipient: "ignored",
          bought: false,
          createdAt: "2026-11-10T00:00:00.000Z",
        },
        { id: "bad" },
        {
          id: "gift-a",
          name: "dup",
          forSelf: false,
          recipient: "X",
          bought: true,
          createdAt: "2026-11-11T00:00:00.000Z",
        },
      ],
    });
    const items = parseGiftsJson(messy);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "gift-a",
      name: "Tea",
      forSelf: true,
      recipient: "",
    });
  });
});

describe("readCachedGifts", () => {
  afterEach(() => {
    invalidateGiftsMemory();
  });

  it("returns a stable reference for the same raw input", () => {
    const gift = createGift({ name: "Senbei", forSelf: true });
    const raw = serializeGifts([gift]);
    const first = readCachedGifts(() => raw);
    const second = readCachedGifts(() => raw);
    expect(second).toBe(first);
    const empty = readCachedGifts(() => null);
    expect(empty).toBe(EMPTY_GIFTS);
  });
});

describe("tabs and recipients", () => {
  it("splits for others vs for myself", () => {
    const mum = createGift({ name: "Tea", forSelf: false, recipient: "Mum" });
    const me = createGift({ name: "Socks", forSelf: true });
    expect(giftsForTab([mum, me], "others").map((g) => g.id)).toEqual([mum.id]);
    expect(giftsForTab([mum, me], "self").map((g) => g.id)).toEqual([me.id]);
  });

  it("remembers recent recipient names without inventing defaults", () => {
    expect(parseRecentRecipients(null)).toEqual([]);
    let names = rememberRecipient([], "Mum");
    names = rememberRecipient(names, "Dad");
    names = rememberRecipient(names, "mum");
    expect(names).toEqual(["mum", "Dad"]);
    expect(rememberRecipient([], "  ")).toEqual([]);
  });
});

describe("link / unlink / spend flag", () => {
  const now = "2026-11-11T03:00:00.000Z";

  it("creates a gift from a flagged spend and updates it on later saves", () => {
    const created = applySpendGiftFlag({
      gifts: [],
      spendId: "spend-1",
      name: "KitKat",
      amount: 800,
      currency: "Yen",
      flagged: true,
      forSelf: false,
      recipient: "Mum",
      now,
    });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      name: "KitKat",
      forSelf: false,
      recipient: "Mum",
      amount: 800,
      currency: "Yen",
      bought: true,
      spendId: "spend-1",
    });

    const updated = applySpendGiftFlag({
      gifts: created,
      spendId: "spend-1",
      name: "Matcha KitKat",
      amount: 900,
      currency: "Yen",
      flagged: true,
      forSelf: false,
      recipient: "Mum",
      now,
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe(created[0]?.id);
    expect(updated[0]?.name).toBe("Matcha KitKat");
    expect(updated[0]?.amount).toBe(900);
  });

  it("unlinks rather than deleting when the spend flag is cleared", () => {
    const linked = applySpendGiftFlag({
      gifts: [],
      spendId: "spend-1",
      name: "Tea",
      amount: 500,
      currency: "Yen",
      flagged: true,
      forSelf: true,
      recipient: "",
      now,
    });
    const unlinked = applySpendGiftFlag({
      gifts: linked,
      spendId: "spend-1",
      name: "Tea",
      amount: 500,
      currency: "Yen",
      flagged: false,
      forSelf: true,
      recipient: "",
      now,
    });
    expect(unlinked).toHaveLength(1);
    expect(unlinked[0]?.spendId).toBeUndefined();
    expect(unlinked[0]?.name).toBe("Tea");
    expect(findGiftBySpendId(unlinked, "spend-1")).toBeUndefined();
  });

  it("treats a deleted spend as unlinked and does not double-count money", () => {
    const gift = createGift({
      name: "Tea",
      forSelf: false,
      recipient: "Mum",
      amount: 999,
      currency: "Yen",
      spendId: "spend-1",
      bought: true,
    });
    const shop = spend("spend-1", { amount: 800, currency: "Yen" });
    expect(resolveLinkedSpend(gift, [shop])).toBe("spend-1");
    expect(giftMoney(gift, [shop])).toEqual({
      source: "spend",
      amount: 800,
      currency: "Yen",
      spendId: "spend-1",
    });
    expect(resolveLinkedSpend(gift, [])).toBeUndefined();
    expect(findSpendForGift(gift, [])).toBeUndefined();
    expect(giftMoney(gift, [])).toEqual({
      source: "note",
      amount: 999,
      currency: "Yen",
    });
  });

  it("links an existing gift to a spend and prefers Shop/Other in the picker", () => {
    const gift = createGift({ name: "Tea", forSelf: true });
    const food = spend("s-food", { name: "Ramen", category: "Food", start: "2026-11-11" });
    const shop = spend("s-shop", { name: "Donki", category: "Shop", start: "2026-11-10" });
    const other = spend("s-other", { name: "Misc", category: "Other", start: "2026-11-09" });
    expect(spendsForGiftPicker([food, shop, other]).map((s) => s.id)).toEqual([
      "s-shop",
      "s-other",
      "s-food",
    ]);
    const linked = linkGiftToSpend([gift], gift.id, shop, now);
    expect(linked[0]).toMatchObject({
      id: gift.id,
      spendId: "s-shop",
      amount: shop.amount,
      currency: shop.currency,
      bought: true,
    });
    const cleared = unlinkGiftFromSpend(linked, "s-shop", now);
    expect(cleared[0]?.spendId).toBeUndefined();
  });

  it("upserts and deletes gifts", () => {
    const a = createGift({ name: "A", forSelf: true });
    let items = upsertGift([], a);
    items = upsertGift(items, { ...a, notes: "keep" });
    expect(items).toHaveLength(1);
    expect(items[0]?.notes).toBe("keep");
    expect(deleteGift(items, a.id)).toEqual([]);
  });
});
