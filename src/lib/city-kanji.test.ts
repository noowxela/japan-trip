import { describe, expect, it } from "vitest";
import { cityKanji } from "@/lib/city-kanji";

describe("cityKanji", () => {
  it("maps known cities", () => {
    expect(cityKanji("Tokyo")).toBe("東京");
    expect(cityKanji("Kyoto")).toBe("京都");
    expect(cityKanji("Osaka")).toBe("大阪");
    expect(cityKanji("Nara")).toBe("奈良");
  });

  it("accepts Chinese names", () => {
    expect(cityKanji("东京")).toBe("東京");
    expect(cityKanji("京都")).toBe("京都");
  });

  it("returns null for unknown or empty", () => {
    expect(cityKanji(null)).toBeNull();
    expect(cityKanji("")).toBeNull();
    expect(cityKanji("Sapporo")).toBeNull();
  });
});
