import { describe, expect, it } from "vitest";
import {
  defaultsForCard,
  deepFindWalletAmount,
  diagnoseIngestPayload,
  ingestDuplicateMatches,
  ingestExpenseName,
  ingestSourceNotes,
  mergeIngestQueryParams,
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

  it("rejects empty, invalid, or negative values", () => {
    expect(parseWalletAmount("")).toBeNull();
    expect(parseWalletAmount("abc")).toBeNull();
    expect(parseWalletAmount("¥")).toBeNull();
    expect(parseWalletAmount(-40)).toBeNull();
    expect(parseWalletAmount(null)).toBeNull();
  });

  it("keeps an explicit zero distinct from missing/invalid", () => {
    expect(parseWalletAmount(0)).toBe(0);
    expect(parseWalletAmount("0")).toBe(0);
    expect(parseWalletAmount("¥0")).toBe(0);
    expect(parseWalletAmount("0円")).toBe(0);
    expect(parseWalletAmount("0.00")).toBe(0);
    expect(parseWalletAmount({ amount: 0, currency: "JPY" })).toBe(0);
    expect(parseWalletAmount({ Amount: "¥0", CurrencyCode: "JPY" })).toBe(0);
  });

  it("unwraps nested Currency Amount dictionaries", () => {
    expect(parseWalletAmount({ amount: 210, currency: "JPY" })).toBe(210);
    expect(parseWalletAmount({ Amount: "¥1,280", CurrencyCode: "JPY" })).toBe(
      1280,
    );
    expect(parseWalletAmount({ value: 99 })).toBe(99);
    expect(
      parseWalletAmount(JSON.stringify({ amount: 55, currency: "JPY" })),
    ).toBe(55);
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
    if (!result.ok || result.entryDetect) return;
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

  it("treats an explicit zero as a transit entry detect, not a booking", () => {
    const result = planSpendIngest({
      amount: 0,
      merchant: "JR East",
      card: "Suica",
    });
    expect(result).toEqual({
      ok: true,
      entryDetect: true,
      amount: 0,
      name: "JR East",
      merchant: "JR East",
      card: "Suica",
    });
  });

  it("treats Wallet-style ¥0 strings and nested objects as entry detect", () => {
    for (const amount of ["¥0", "0円", { amount: 0, currency: "JPY" }]) {
      const result = planSpendIngest({ amount, card: "Suica" });
      expect(result.ok).toBe(true);
      if (!result.ok || !result.entryDetect) {
        throw new Error("expected entry detect");
      }
      expect(result.amount).toBe(0);
      expect(result.card).toBe("Suica");
      expect(result.name).toBe("Suica");
    }
  });

  it("parses nested Wallet Currency Amount objects", () => {
    const result = planSpendIngest({
      amount: { amount: 350, currency: "JPY" },
      merchant: "Seven-Eleven",
      card: "Suica",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.entryDetect) return;
    expect(result.plan).toMatchObject({
      amount: 350,
      name: "Seven-Eleven",
      currency: "Yen",
      category: "Transit",
    });
  });

  it("accepts Currency Amount key and Wallet Name as merchant", () => {
    const result = planSpendIngest({
      "Currency Amount": { Amount: "¥480", CurrencyCode: "JPY" },
      Name: "京都地下鉄",
      "Card or Pass": "Suica",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.entryDetect) return;
    expect(result.plan).toMatchObject({
      amount: 480,
      name: "京都地下鉄",
      card: "Suica",
      category: "Transit",
      currency: "Yen",
    });
  });

  it("unwraps a transaction wrapper payload", () => {
    const result = planSpendIngest({
      transaction: {
        amount: { amount: 1200, currency: "JPY" },
        merchant: "FamilyMart",
        card: "Wise",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.entryDetect) return;
    expect(result.plan).toMatchObject({
      amount: 1200,
      name: "FamilyMart",
      category: "Other",
      notes: "Apple Pay · Wise",
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

describe("empty Shortcut JSON placeholders", () => {
  it("diagnoses empty amount/card/merchant strings", () => {
    const diag = diagnoseIngestPayload({
      amount: "",
      card: "",
      merchant: "",
    });
    expect(diag.emptyKeys.sort()).toEqual(["amount", "card", "merchant"]);
    expect(diag.amountType).toBe("string");
  });

  it("returns a specific 400 when amount key is empty", () => {
    const result = planSpendIngest({
      amount: "",
      card: "",
      merchant: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toContain("amount was empty");
  });

  it("fills empty body fields from query params", () => {
    const merged = mergeIngestQueryParams(
      { amount: "", card: "", merchant: "" },
      new URLSearchParams({
        amount: "¥230",
        merchant: "Bus",
        card: "Suica",
      }),
    );
    const result = planSpendIngest(merged);
    expect(result.ok).toBe(true);
    if (!result.ok || result.entryDetect) return;
    expect(result.plan).toMatchObject({
      amount: 230,
      name: "Bus",
      card: "Suica",
      category: "Transit",
      currency: "Yen",
    });
  });

  it("deep-finds amount under oddly nested Shortcut wrappers", () => {
    expect(
      deepFindWalletAmount({
        shortcutInput: {
          transaction: {
            "Currency Amount": { Amount: 230, CurrencyCode: "JPY" },
            Name: "Bus",
            "Card or Pass": "Suica",
          },
        },
      }),
    ).toBe(230);
    const result = planSpendIngest({
      shortcutInput: {
        transaction: {
          "Currency Amount": { Amount: 230, CurrencyCode: "JPY" },
          Name: "Bus",
          "Card or Pass": "Suica",
        },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.entryDetect) return;
    expect(result.plan).toMatchObject({
      amount: 230,
      name: "Bus",
      card: "Suica",
      category: "Transit",
    });
  });
});
