import { describe, expect, it } from "vitest";
import { formatDayShareText } from "@/lib/share-day";
import type { AgendaItem } from "@/lib/types";

const item = (
  partial: Partial<AgendaItem> & Pick<AgendaItem, "id" | "name">,
): AgendaItem => ({
  kind: "place",
  chip: "Food",
  start: "2026-11-09T12:00:00+09:00",
  detail: "",
  order: null,
  visited: false,
  skipped: false,
  lat: null,
  lng: null,
  mapsUrl: null,
  ...partial,
});

describe("formatDayShareText", () => {
  it("builds a companion-friendly day list", () => {
    const text = formatDayShareText({
      dayName: "Day 2",
      dateLabel: "11月9日 周日",
      items: [
        item({ id: "1", name: "Lunch", chip: "Food" }),
        item({
          id: "2",
          name: "AirAsia X D7532",
          kind: "transit",
          chip: "Flight",
          start: "2026-11-09T08:15:00+09:00",
        }),
      ],
      appUrl: "https://example.com/schedule?day=d2",
    });
    expect(text).toContain("Day 2 · 11月9日 周日");
    expect(text).toContain("08:15 AirAsia X D7532 (Flight)");
    expect(text).toContain("12:00 Lunch (Food)");
    expect(text).toContain("https://example.com/schedule?day=d2");
  });
});
