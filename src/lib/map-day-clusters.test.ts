import { describe, expect, it } from "vitest";
import {
  clusterByPixelDistance,
  formatDayGroupLabel,
} from "@/lib/map-day-clusters";

describe("formatDayGroupLabel", () => {
  it("formats a single day", () => {
    expect(formatDayGroupLabel([4])).toBe("D5");
  });

  it("formats consecutive ranges", () => {
    expect(formatDayGroupLabel([4, 5, 6])).toBe("D5–7");
    expect(formatDayGroupLabel([1, 2])).toBe("D2–3");
  });

  it("formats sparse days with dots", () => {
    expect(formatDayGroupLabel([1, 3, 5])).toBe("D2·D4·D6");
  });

  it("falls back to count when many sparse days", () => {
    expect(formatDayGroupLabel([0, 2, 4, 6, 8])).toBe("5");
  });
});

describe("clusterByPixelDistance", () => {
  const points = [
    { id: "a", lat: 35, lng: 135, dayIndex: 4 },
    { id: "b", lat: 35.01, lng: 135.01, dayIndex: 5 },
    { id: "c", lat: 36, lng: 140, dayIndex: 1 },
  ];

  it("merges points closer than threshold", () => {
    const clusters = clusterByPixelDistance(
      points,
      [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
        { x: 200, y: 200 },
      ],
      28,
    );
    expect(clusters).toHaveLength(2);
    const multi = clusters.find((c) => c.ids.length > 1)!;
    expect(multi.ids.sort()).toEqual(["a", "b"]);
    expect(multi.dayIndices).toEqual([4, 5]);
  });

  it("keeps distant points separate", () => {
    const clusters = clusterByPixelDistance(
      points,
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ],
      28,
    );
    expect(clusters).toHaveLength(3);
  });
});
