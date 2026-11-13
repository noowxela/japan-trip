import { describe, expect, it } from "vitest";
import {
  dateForSpendItem,
  dayIdForDate,
  formDataForDuplicateSpend,
  formDataFromSpendItem,
  isBeforeTripDate,
  spendStartFromFormData,
} from "@/lib/spend-item-form";
import type { SpendItem, TripDay } from "@/lib/types";

const item = (
  partial: Partial<SpendItem> & Pick<SpendItem, "id" | "amount" | "currency">,
): SpendItem => ({
  name: partial.name ?? partial.id,
  kind: partial.kind ?? "Actual",
  category: partial.category ?? "Food",
  notes: partial.notes ?? "",
  dayIds: partial.dayIds ?? [],
  start: partial.start ?? null,
  paidBy: partial.paidBy ?? null,
  splitWith: partial.splitWith ?? [],
  placeId: partial.placeId ?? null,
  ...partial,
});

const days: TripDay[] = [
  { id: "d1", name: "Day 1", date: "2026-11-06", city: "Osaka", status: null },
  { id: "d2", name: "Day 2", date: "2026-11-07", city: "Osaka", status: null },
];

function entries(formData: FormData) {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    const text = String(value);
    const existing = result[key];
    if (existing === undefined) result[key] = text;
    else if (Array.isArray(existing)) existing.push(text);
    else result[key] = [existing, text];
  }
  return result;
}

describe("date helpers", () => {
  it("prefers start date, then the linked trip day", () => {
    expect(
      dateForSpendItem(
        item({
          id: "a",
          amount: 10,
          currency: "RM",
          start: "2026-11-07T13:30:00+09:00",
          dayIds: ["d1"],
        }),
        days,
      ),
    ).toBe("2026-11-07");
    expect(
      dateForSpendItem(
        item({ id: "b", amount: 10, currency: "RM", dayIds: ["d1"] }),
        days,
      ),
    ).toBe("2026-11-06");
    expect(dayIdForDate(days, "2026-11-07")).toBe("d2");
    expect(dayIdForDate(days, "2026-10-01")).toBe("");
    expect(dayIdForDate(days, "")).toBe("");
  });

  it("treats empty and pre-trip dates as 出发前", () => {
    expect(isBeforeTripDate("", days)).toBe(true);
    expect(isBeforeTripDate("2026-11-01", days)).toBe(true);
    expect(isBeforeTripDate("2026-11-06", days)).toBe(false);
  });
});

describe("formDataFromSpendItem", () => {
  const lunch = item({
    id: "sp1",
    name: "Ramen",
    amount: 1200,
    currency: "Yen",
    kind: "Actual",
    category: "Food",
    notes: "near Namba",
    dayIds: ["d1"],
    start: "2026-11-06T12:15:00+09:00",
    paidBy: "Alex",
    splitWith: ["Alex", "Sam"],
    placeId: "place-1",
  });

  it("copies existing fields including time, payer, and place", () => {
    expect(entries(formDataFromSpendItem(lunch, days))).toEqual({
      id: "sp1",
      name: "Ramen",
      amount: "1200",
      currency: "Yen",
      kind: "Actual",
      category: "Food",
      notes: "near Namba",
      dayId: "d1",
      dayDate: "2026-11-06",
      time: "12:15",
      paidBy: "Alex",
      splitWith: ["Alex", "Sam"],
      placeId: "place-1",
    });
  });

  it("clears the food place when the category is no longer Food", () => {
    const formData = formDataFromSpendItem(lunch, days, { category: "Airfare" });
    expect(formData.get("category")).toBe("Airfare");
    expect(formData.get("placeId")).toBeNull();
  });

  it("remaps dayId when moving to another trip day and keeps the time", () => {
    const formData = formDataFromSpendItem(lunch, days, {
      dayDate: "2026-11-07",
    });
    expect(formData.get("dayDate")).toBe("2026-11-07");
    expect(formData.get("dayId")).toBe("d2");
    expect(formData.get("time")).toBe("12:15");
  });

  it("clears dayId for a pre-trip date and for the undated 出发前 group", () => {
    const preTrip = formDataFromSpendItem(lunch, days, {
      dayDate: "2026-10-20",
    });
    expect(preTrip.get("dayDate")).toBe("2026-10-20");
    expect(preTrip.get("dayId")).toBe("");

    const beforeTrip = formDataFromSpendItem(lunch, days, { dayDate: "" });
    expect(beforeTrip.get("dayDate")).toBeNull();
    expect(beforeTrip.get("dayId")).toBe("");
  });

  it("omits id when duplicating so addSpend can create a new row", () => {
    const formData = formDataForDuplicateSpend(lunch, days);
    expect(formData.get("id")).toBeNull();
    expect(formData.get("name")).toBe("Ramen");
    expect(formData.get("dayId")).toBe("d1");
    expect(formData.get("time")).toBe("12:15");
  });
});

describe("spendStartFromFormData", () => {
  const lunch = item({
    id: "sp1",
    name: "Ramen",
    amount: 1200,
    currency: "Yen",
    kind: "Actual",
    category: "Food",
    notes: "near Namba",
    dayIds: ["d1"],
    start: "2026-11-06T12:15:00+09:00",
    paidBy: "Alex",
    splitWith: ["Alex", "Sam"],
    placeId: "place-1",
  });

  it("remaps the Tokyo start when moving a timed spend to another day", () => {
    const formData = formDataFromSpendItem(lunch, days, {
      dayDate: "2026-11-07",
    });
    expect(spendStartFromFormData(formData)).toBe("2026-11-07T12:15:00+09:00");
  });

  it("writes a date-only Start when the spend has no time", () => {
    const formData = formDataFromSpendItem(
      item({
        id: "c",
        amount: 10,
        currency: "RM",
        dayIds: ["d1"],
        start: "2026-11-06",
      }),
      days,
      { dayDate: "2026-11-07" },
    );
    expect(spendStartFromFormData(formData)).toBe("2026-11-07");
  });

  it("clears Start when moving to the undated 出发前 group", () => {
    const formData = formDataFromSpendItem(lunch, days, { dayDate: "" });
    expect(formData.get("dayDate")).toBeNull();
    expect(formData.get("time")).toBe("12:15");
    expect(spendStartFromFormData(formData)).toBe("");
  });

  it("keeps an explicit pre-trip calendar date", () => {
    const formData = formDataFromSpendItem(lunch, days, {
      dayDate: "2026-10-20",
    });
    expect(spendStartFromFormData(formData)).toBe("2026-10-20T12:15:00+09:00");
  });
});
