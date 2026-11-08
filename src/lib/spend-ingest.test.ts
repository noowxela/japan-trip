import { describe, expect, it } from "vitest";
import {
  defaultsForCard,
  ingestDuplicateMatches,
  ingestExpenseName,
  ingestSourceNotes,
  parseWalletAmount,
  planSpendIngest,
  todayDayId,
} from "@/lib/spend-ingest";

describe("parseWalletAmount", () => {
  it("parses Wallet-style yen strings", () => {
    expect(parseWalletAmount("¥120")).toBe(120);
    expect(parseWalletAmount("￥120")).toBe(120);
    expect(parseWalletAmount("120円")).toBe(120);
    expect(parseWalletAmount("JPY 120")).toBe(120);
    expect(parseWalletAmount("¥1,280")).toBe(1280);
    expect(parseWalletAmount("1,234")).toBe(1234);
    expect(parseWalletAmount("  ¥ 1,280  ")).toBe(1280);
    expect(parseWalletAmount("¥1,234.00")).toBe(1234);
    expect(parseWalletAmount("１２０")).toBe(120);
    expect(parseWalletAmount(240)).toBe(240);
  });

  it("rejects empty or non-positive values", () => {
    expect(parseWalletAmount("")).toBeNull();
    expect(parseWalletAmount("abc")).toBeNull();
    expect(parseWalletAmount("¥")).toBeNull();
    expect(parseWalletAmount(0)).toBeNull();
    expect(parseWalletAmount(-40)).toBeNull();
    expect(parseWalletAmount(null)).toBeNull();
  });
});

describe("defaultsForCard", () => {
  it("maps Suica to Transit yen actuals", () => {
    expect(defaultsForCard("Suica")).toEqual({
      category: "Transit",
      currency: "Yen",
      kind: "Actual",
      sourceLabel: "Suica",
    });
    expect(defaultsForCard("モバイルSuica")).toMatchObject({
      category: "Transit",
      sourceLabel: "Suica",
    });
  });

  it("maps Wise to Other yen actuals", () => {
    expect(defaultsForCard("Wise")).toEqual({
      category: "Other",
      currency: "Yen",
      kind: "Actual",
      sourceLabel: "Wise",
    });
    expect(defaultsForCard("Wise Debit")).toMatchObject({
      category: "Other",
      sourceLabel: "Wise",
    });
  });

  it("falls back to Other for unknown cards", () => {
    expect(defaultsForCard("")).toEqual({
      category: "Other",
      currency: "Yen",
      kind: "Actual",
      sourceLabel: "Apple Pay",
    });
    expect(defaultsForCard("Apple Card").category).toBe("Other");
  });
});

describe("ingest naming", () => {
  it("prefers merchant, then card, then category", () => {
    expect(
      ingestExpenseName({
        merchant: "JR East",
        card: "Suica",
        category: "Transit",
      }),
    ).toBe("JR East");
    expect(
      ingestExpenseName({ merchant: "", card: "Suica", category: "Transit" }),
    ).toBe("Suica");
    expect(
      ingestExpenseName({ merchant: "", card: "", category: "Transit" }),
    ).toBe("Transit");
  });

  it("builds Apple Pay notes from the card label", () => {
    expect(ingestSourceNotes("Suica")).toBe("Apple Pay · Suica");
    expect(ingestSourceNotes("Wise")).toBe("Apple Pay · Wise");
    expect(ingestSourceNotes("Apple Pay")).toBe("Apple Pay");
  });
});

describe("planSpendIngest", () => {
  it("applies Suica defaults", () => {
    const result = planSpendIngest({
      Amount: "¥210",
      Merchant: "Tokyo Metro",
      Card: "Suica",
    });
    expect(result).toEqual({
      ok: true,
      plan: {
        amount: 210,
        name: "Tokyo Metro",
        merchant: "Tokyo Metro",
        card: "Suica",
        category: "Transit",
        kind: "Actual",
        currency: "Yen",
        notes: "Apple Pay · Suica",
        clientId: "",
        paidBy: "",
      },
    });
  });

  it("applies Wise defaults and uses the card as the name when merchant is missing", () => {
    const result = planSpendIngest({ amount: "1,080円", card: "Wise" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan).toMatchObject({
      amount: 1080,
      name: "Wise",
      category: "Other",
      kind: "Actual",
      currency: "Yen",
      notes: "Apple Pay · Wise",
    });
  });

  it("returns 400 when the amount cannot be parsed", () => {
    expect(planSpendIngest({ card: "Suica" })).toEqual({
      ok: false,
      error: "A valid amount is required",
      status: 400,
    });
  });
});

describe("todayDayId", () => {
  it("resolves the itinerary day for a Tokyo calendar date", () => {
    const days = [
      { id: "d1", date: "2026-11-07" },
      { id: "d2", date: "2026-11-08T00:00:00+09:00" },
    ];
    expect(todayDayId(days, "2026-11-08")).toBe("d2");
    expect(todayDayId(days, "2026-11-09")).toBe("");
  });
});

describe("ingestDuplicateMatches", () => {
  const base = {
    name: "Tokyo Metro",
    amount: 210,
    currency: "Yen",
    dayId: "day-1",
    nowMs: Date.parse("2026-11-08T16:05:00+09:00"),
    candidate: {
      name: "Tokyo Metro",
      amount: 210,
      currency: "Yen",
      dayIds: ["day-1"],
      createdTime: "2026-11-08T07:04:00.000Z",
    },
  };

  it("matches the same name, amount, currency, and day within two minutes", () => {
    expect(ingestDuplicateMatches(base)).toBe(true);
  });

  it("rejects a different amount or an older row", () => {
    expect(
      ingestDuplicateMatches({
        ...base,
        candidate: { ...base.candidate, amount: 180 },
      }),
    ).toBe(false);
    expect(
      ingestDuplicateMatches({
        ...base,
        candidate: { ...base.candidate, createdTime: "2026-11-08T06:55:00.000Z" },
      }),
    ).toBe(false);
  });
});
