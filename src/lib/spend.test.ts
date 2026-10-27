import { describe, expect, it } from "vitest";
import {
  byDay,
  moneySummary,
  parseSpendCurrency,
  toRm,
} from "@/lib/spend";
import type { SpendItem } from "@/lib/types";

const item = (
  partial: Partial<SpendItem> & Pick<SpendItem, "id" | "amount" | "currency">,
): SpendItem => ({
  name: partial.name ?? partial.id,
  kind: partial.kind ?? null,
  category: partial.category ?? null,
  notes: partial.notes ?? "",
  dayIds: partial.dayIds ?? [],
  start: partial.start ?? null,
  paidBy: partial.paidBy ?? null,
  ...partial,
});

describe("parseSpendCurrency", () => {
  it("accepts Yen and defaults everything else to RM", () => {
    expect(parseSpendCurrency("Yen")).toBe("Yen");
    expect(parseSpendCurrency("RM")).toBe("RM");
    expect(parseSpendCurrency(null)).toBe("RM");
    expect(parseSpendCurrency("usd")).toBe("RM");
  });
});

describe("toRm", () => {
  it("converts Yen with an explicit jpyPerRm and leaves RM alone", () => {
    expect(toRm(3930, "Yen", 39.3)).toBeCloseTo(100);
    expect(toRm(50, "RM", 39.3)).toBe(50);
    expect(toRm(400, "Yen", 40)).toBe(10);
  });
});

describe("byDay", () => {
  it("filters items that list the day id", () => {
    const items = [
      item({ id: "a", amount: 10, currency: "RM", dayIds: ["d1"] }),
      item({ id: "b", amount: 20, currency: "RM", dayIds: ["d2", "d1"] }),
      item({ id: "c", amount: 30, currency: "RM", dayIds: ["d3"] }),
    ];
    expect(byDay(items, "d1").map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("moneySummary", () => {
  it("sums estimate vs actual in RM using jpyPerRm for Yen rows", () => {
    const items = [
      item({ id: "e1", amount: 100, currency: "RM", kind: "Estimate" }),
      item({ id: "e2", amount: 3930, currency: "Yen", kind: "Estimate" }),
      item({ id: "a1", amount: 40, currency: "RM", kind: "Actual" }),
      item({ id: "a2", amount: 786, currency: "Yen", kind: "Actual" }),
    ];
    const jpyPerRm = 39.3;
    expect(moneySummary(items, jpyPerRm)).toEqual({
      estimate: 200,
      actual: 60,
      remaining: 140,
    });
  });
});
