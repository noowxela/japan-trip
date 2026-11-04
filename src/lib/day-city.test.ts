import { describe, expect, it } from "vitest";
import { cityPropertyValue } from "@/lib/day-city";

describe("cityPropertyValue", () => {
  it("writes a select when the column is select", () => {
    expect(cityPropertyValue("select", "Kyoto")).toEqual({ select: { name: "Kyoto" } });
    expect(cityPropertyValue("select", "")).toEqual({ select: null });
  });

  it("keeps a multi-city day and moves the chosen city first", () => {
    expect(cityPropertyValue("multi_select", "Kyoto", ["Kyoto", "Osaka"])).toEqual({
      multi_select: [{ name: "Kyoto" }, { name: "Osaka" }],
    });
    expect(cityPropertyValue("multi_select", "Osaka", ["Kyoto", "Osaka"])).toEqual({
      multi_select: [{ name: "Osaka" }, { name: "Kyoto" }],
    });
  });

  it("replaces the list when a new city is picked, clears when empty", () => {
    expect(cityPropertyValue("multi_select", "Tokyo", ["Kyoto", "Osaka"])).toEqual({
      multi_select: [{ name: "Tokyo" }],
    });
    expect(cityPropertyValue("multi_select", "Osaka")).toEqual({
      multi_select: [{ name: "Osaka" }],
    });
    expect(cityPropertyValue("multi_select", "", ["Kyoto"])).toEqual({ multi_select: [] });
  });
});
