import { afterEach, describe, expect, it } from "vitest";
import type { Stay } from "@/lib/types";
import {
  BUILTIN_PHRASES,
  CUSTOM_PHRASES_VERSION,
  EMPTY_CUSTOM_PHRASES,
  HOTEL_TAXI_PHRASE_JA,
  PHRASE_CATEGORIES,
  buildHotelCards,
  createCustomPhrase,
  deleteCustomPhrase,
  invalidateCustomPhrasesMemory,
  parseCustomPhrasesJson,
  phrasesByCategory,
  readCachedCustomPhrases,
  serializeCustomPhrases,
  stayDisplayAddress,
  upsertCustomPhrase,
} from "@/lib/phrases";

describe("BUILTIN_PHRASES", () => {
  it("has unique ids", () => {
    const ids = BUILTIN_PHRASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every phrase has required fields", () => {
    for (const p of BUILTIN_PHRASES) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(PHRASE_CATEGORIES).toContain(p.category);
      expect(p.category).not.toBe("custom");
      expect(p.ja.trim().length).toBeGreaterThan(0);
      expect(p.reading.trim().length).toBeGreaterThan(0);
      expect(p.zh.trim().length).toBeGreaterThan(0);
      expect(p.en.trim().length).toBeGreaterThan(0);
    }
  });

  it("every non-custom category is non-empty", () => {
    for (const cat of PHRASE_CATEGORIES) {
      if (cat === "custom") continue;
      expect(phrasesByCategory(cat).length).toBeGreaterThanOrEqual(6);
    }
  });

  it("allergy includes common allergens and fill-in", () => {
    const allergy = phrasesByCategory("allergy");
    expect(allergy.some((p) => p.ja.includes("えびアレルギー"))).toBe(true);
    expect(allergy.some((p) => p.ja.includes("〇〇アレルギー"))).toBe(true);
    expect(
      allergy.some((p) => p.ja.includes("この料理に〇〇は入っていますか")),
    ).toBe(true);
  });

  it("emergency includes ambulance phrase", () => {
    expect(
      phrasesByCategory("emergency").some((p) =>
        p.ja.includes("救急車を呼んでください"),
      ),
    ).toBe(true);
  });
});

describe("parseCustomPhrasesJson / serialize", () => {
  it("returns [] for empty or invalid", () => {
    expect(parseCustomPhrasesJson(null)).toEqual([]);
    expect(parseCustomPhrasesJson("")).toEqual([]);
    expect(parseCustomPhrasesJson("not-json")).toEqual([]);
    expect(parseCustomPhrasesJson("{}")).toEqual([]);
    expect(parseCustomPhrasesJson('{"v":99,"items":[]}')).toEqual([]);
  });

  it("round-trips valid store", () => {
    const phrase = createCustomPhrase({
      ja: "すみません",
      reading: "すみません",
      zh: "不好意思",
    });
    const raw = serializeCustomPhrases([phrase]);
    const parsed = JSON.parse(raw) as { v: number; items: unknown[] };
    expect(parsed.v).toBe(CUSTOM_PHRASES_VERSION);
    expect(parseCustomPhrasesJson(raw)).toEqual([phrase]);
  });

  it("skips bad items and duplicate ids", () => {
    const raw = JSON.stringify({
      v: 1,
      items: [
        {
          id: "custom-a",
          category: "custom",
          custom: true,
          ja: "はい",
          reading: "はい",
          zh: "是",
          en: "Yes",
        },
        { id: "bad" },
        {
          id: "custom-a",
          category: "custom",
          custom: true,
          ja: "dup",
          reading: "",
          zh: "dup",
          en: "dup",
        },
      ],
    });
    const items = parseCustomPhrasesJson(raw);
    expect(items).toHaveLength(1);
    expect(items[0]!.ja).toBe("はい");
  });
});

describe("readCachedCustomPhrases", () => {
  afterEach(() => {
    invalidateCustomPhrasesMemory();
  });

  it("returns the same reference for the same raw input", () => {
    const phrase = createCustomPhrase({
      ja: "ありがとう",
      reading: "ありがとう",
      zh: "谢谢",
    });
    const raw = serializeCustomPhrases([phrase]);
    const getRaw = () => raw;

    const first = readCachedCustomPhrases(getRaw);
    const second = readCachedCustomPhrases(getRaw);
    expect(first).toEqual([phrase]);
    expect(second).toBe(first);
  });

  it("returns a new reference after the raw value changes", () => {
    const a = createCustomPhrase({ ja: "A", zh: "甲" });
    const b = createCustomPhrase({ ja: "B", zh: "乙" });
    let current: string | null = serializeCustomPhrases([a]);
    const getRaw = () => current;

    const first = readCachedCustomPhrases(getRaw);
    current = serializeCustomPhrases([a, b]);
    const second = readCachedCustomPhrases(getRaw);
    expect(second).not.toBe(first);
    expect(second).toHaveLength(2);

    current = null;
    const third = readCachedCustomPhrases(getRaw);
    expect(third).toBe(EMPTY_CUSTOM_PHRASES);
    expect(third).not.toBe(second);
  });
});

describe("upsert / delete custom", () => {
  it("adds, updates, deletes", () => {
    const a = createCustomPhrase({ ja: "A", zh: "甲" });
    const b = createCustomPhrase({ ja: "B", zh: "乙" });
    let list = upsertCustomPhrase([], a);
    list = upsertCustomPhrase(list, b);
    expect(list).toHaveLength(2);
    list = upsertCustomPhrase(list, { ...a, ja: "A2" });
    expect(list.find((p) => p.id === a.id)?.ja).toBe("A2");
    list = deleteCustomPhrase(list, a.id);
    expect(list.map((p) => p.id)).toEqual([b.id]);
  });
});

describe("buildHotelCards / stayDisplayAddress", () => {
  const base: Stay = {
    id: "s1",
    name: "Hotel Tokyo",
    checkIn: "2026-04-01",
    checkOut: "2026-04-03",
    address: "1-1 Chiyoda, Tokyo",
    bookingUrl: null,
    confirmation: "",
  };

  it("uses address when no Japanese field", () => {
    expect(stayDisplayAddress(base)).toBe("1-1 Chiyoda, Tokyo");
  });

  it("prefers addressJa / japaneseAddress", () => {
    expect(
      stayDisplayAddress({
        ...base,
        addressJa: "東京都千代田区1-1",
      }),
    ).toBe("東京都千代田区1-1");
    expect(
      stayDisplayAddress({
        ...base,
        japaneseAddress: "大阪府大阪市1-2",
      }),
    ).toBe("大阪府大阪市1-2");
  });

  it("builds taxi cards with fixed phrase", () => {
    const cards = buildHotelCards([base]);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.stayId).toBe("s1");
    expect(cards[0]!.ja).toContain("Hotel Tokyo");
    expect(cards[0]!.ja).toContain("1-1 Chiyoda, Tokyo");
    expect(cards[0]!.ja).toContain(HOTEL_TAXI_PHRASE_JA);
    expect(cards[0]!.phone).toBeNull();
  });

  it("includes phone when present on stay-like object", () => {
    const cards = buildHotelCards([
      { ...base, phone: "03-1234-5678" } as Stay & { phone: string },
    ]);
    expect(cards[0]!.phone).toBe("03-1234-5678");
  });

  it("skips empty stays", () => {
    expect(
      buildHotelCards([
        { ...base, id: "empty", name: "  ", address: "" },
      ]),
    ).toEqual([]);
  });
});
