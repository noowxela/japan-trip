import { describe, expect, it } from "vitest";
import { notionStartProperty } from "@/lib/notion-date";

describe("notionStartProperty", () => {
  it("omits time_zone when the timestamp already has an offset", () => {
    expect(notionStartProperty("2026-11-06T14:32:00+09:00")).toEqual({
      date: { start: "2026-11-06T14:32:00+09:00" },
    });
    expect(notionStartProperty("2026-11-06T05:32:00Z")).toEqual({
      date: { start: "2026-11-06T05:32:00Z" },
    });
  });

  it("adds Asia/Tokyo only for a time with no offset", () => {
    expect(notionStartProperty("2026-11-06T14:32:00")).toEqual({
      date: { start: "2026-11-06T14:32:00", time_zone: "Asia/Tokyo" },
    });
  });

  it("keeps date-only values and empty input as a null date", () => {
    expect(notionStartProperty("2026-11-06")).toEqual({
      date: { start: "2026-11-06" },
    });
    expect(notionStartProperty("")).toEqual({ date: null });
    expect(notionStartProperty(null)).toEqual({ date: null });
  });
});
