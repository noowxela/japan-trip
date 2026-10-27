import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dateKey,
  ensureTokyoOffset,
  formatGapMinutes,
  formatTabDate,
  formatTabWeekday,
  formatTime,
  gapBetweenStarts,
  minutesBetweenStarts,
  nightsBetween,
  tokyoToday,
  tokyoWallDateTime,
} from "@/lib/format";

describe("formatTime", () => {
  it("formats 24h times in Asia/Tokyo including +08:00 input", () => {
    expect(formatTime("2026-10-27T09:30:00+09:00")).toBe("09:30");
    expect(formatTime("2026-10-27T09:30:00+08:00")).toBe("10:30");
    expect(formatTime("2026-10-27T23:15:00+09:00")).toBe("23:15");
    expect(formatTime(null)).toBeNull();
    expect(formatTime("2026-10-27")).toBeNull();
  });
});

describe("tokyo wall-clock datetimes", () => {
  const prevTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Kuala_Lumpur";
    vi.stubEnv("TZ", "Asia/Kuala_Lumpur");
  });

  afterEach(() => {
    if (prevTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = prevTz;
    }
    vi.unstubAllEnvs();
  });

  it("builds Start with +09:00 so 03:43 stays 03:43 under MYT", () => {
    expect(tokyoWallDateTime("2026-10-27", "03:43")).toBe(
      "2026-10-27T03:43:00+09:00",
    );
    expect(formatTime("2026-10-27T03:43:00+09:00")).toBe("03:43");
    // Offset-less Notion/legacy values must not be parsed in process TZ.
    expect(ensureTokyoOffset("2026-10-27T03:43:00")).toBe(
      "2026-10-27T03:43:00+09:00",
    );
    expect(formatTime("2026-10-27T03:43:00")).toBe("03:43");
  });
});

describe("dateKey", () => {
  it("keeps the YYYY-MM-DD prefix", () => {
    expect(dateKey("2026-10-27T09:30:00+09:00")).toBe("2026-10-27");
    expect(dateKey("2026-10-27")).toBe("2026-10-27");
    expect(dateKey(null)).toBeNull();
  });
});

describe("formatGapMinutes / gapBetweenStarts", () => {
  it("formats free gaps and ignores non-positive spans", () => {
    expect(formatGapMinutes(45, "en")).toBe("45m free");
    expect(formatGapMinutes(60, "en")).toBe("1h free");
    expect(formatGapMinutes(90, "en")).toBe("1h 30m free");
    expect(formatGapMinutes(90, "zh")).toBe("空闲 1小时30分");
    expect(formatGapMinutes(0)).toBeNull();
  });

  it("computes the gap between two start timestamps in Tokyo time", () => {
    expect(
      gapBetweenStarts(
        "2026-10-27T09:00:00+09:00",
        "2026-10-27T10:30:00+09:00",
        "en",
      ),
    ).toBe("1h 30m free");
    expect(
      gapBetweenStarts(
        "2026-10-27T10:00:00+09:00",
        "2026-10-27T09:00:00+09:00",
      ),
    ).toBeNull();
    expect(
      minutesBetweenStarts(
        "2026-10-27T09:00:00+09:00",
        "2026-10-27T09:10:00+09:00",
      ),
    ).toBe(10);
  });
});

describe("formatTabDate / formatTabWeekday", () => {
  it("renders compact tab labels", () => {
    expect(formatTabDate("2026-10-27")).toBe("10/27");
    expect(formatTabWeekday("2026-10-27", "en")).toBe("Tue");
    expect(formatTabWeekday("2026-10-27", "zh")).toBe("周二");
    expect(formatTabDate(null)).toBe("—");
    expect(formatTabWeekday(null)).toBe("—");
  });
});

describe("nightsBetween", () => {
  it("counts hotel nights and rejects missing/non-positive spans", () => {
    expect(nightsBetween("2026-10-25", "2026-10-28")).toBe(3);
    expect(nightsBetween("2026-10-25T15:00:00+09:00", "2026-10-28")).toBe(3);
    expect(nightsBetween("2026-10-25", "2026-10-25")).toBeNull();
    expect(nightsBetween(null, "2026-10-28")).toBeNull();
    expect(nightsBetween("2026-10-25", null)).toBeNull();
  });
});

describe("tokyoToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the Asia/Tokyo calendar date", () => {
    vi.setSystemTime(new Date("2026-10-26T16:30:00Z"));
    expect(tokyoToday()).toBe("2026-10-27");
  });
});
