import { describe, expect, it } from "vitest";
import { categoryEmoji, spendCategoryEmoji } from "@/lib/category-icon";

describe("categoryEmoji", () => {
  it("uses the requested food icon", () => {
    expect(categoryEmoji("place", "Food")).toBe("🍽️");
  });

  it("maps place types and transit modes", () => {
    expect(categoryEmoji("place", "Sight")).toBe("⛩️");
    expect(categoryEmoji("place", "Shop")).toBe("🛍️");
    expect(categoryEmoji("place", "Cafe")).toBe("☕");
    expect(categoryEmoji("place", "Other")).toBe("📍");
    expect(categoryEmoji("transit", "Flight")).toBe("✈️");
    expect(categoryEmoji("transit", "Shinkansen")).toBe("🚅");
    expect(categoryEmoji("transit", "Metro")).toBe("🚇");
    expect(categoryEmoji("transit", "Bus")).toBe("🚌");
    expect(categoryEmoji("transit", "Walk")).toBe("🚶");
  });

  it("omits a place icon when there is no type", () => {
    expect(categoryEmoji("place", null)).toBeNull();
  });
});

describe("spendCategoryEmoji", () => {
  it("matches Schedule emoji for shared Food/Shop categories", () => {
    expect(spendCategoryEmoji("Food")).toBe("🍽️");
    expect(spendCategoryEmoji("Shop")).toBe("🛍️");
  });

  it("maps spend-only categories and falls back", () => {
    expect(spendCategoryEmoji("Transit")).toBe("🚆");
    expect(spendCategoryEmoji("Stay")).toBe("🏨");
    expect(spendCategoryEmoji("Ticket")).toBe("🎫");
    expect(spendCategoryEmoji("Other")).toBe("📦");
    expect(spendCategoryEmoji(null)).toBe("📦");
    expect(spendCategoryEmoji("Weird")).toBe("📦");
  });
});
