import { describe, expect, it } from "vitest";
import { formatOverviewSummaryLine } from "@/lib/overview-summary";

describe("formatOverviewSummaryLine", () => {
  it("formats mid-trip day n/N with span and cities (zh)", () => {
    const line = formatOverviewSummaryLine({
      today: "2026-10-27",
      tripStart: "2026-10-25",
      tripEnd: "2026-11-01",
      cityFlow: "东京 → 京都 → 大阪",
      locale: "zh",
      dayCount: 8,
    });
    expect(line).toContain("第3/8天");
    expect(line).toContain("东京 → 京都 → 大阪");
    expect(line.split(" · ").length).toBeGreaterThanOrEqual(2);
  });

  it("formats countdown before departure (en)", () => {
    const line = formatOverviewSummaryLine({
      today: "2026-10-20",
      tripStart: "2026-10-25",
      tripEnd: "2026-11-01",
      cityFlow: "Tokyo → Kyoto",
      locale: "en",
      dayCount: 8,
    });
    expect(line).toContain("5d to go");
    expect(line).toContain("Tokyo → Kyoto");
  });

  it("formats completed trip", () => {
    const line = formatOverviewSummaryLine({
      today: "2026-11-05",
      tripStart: "2026-10-25",
      tripEnd: "2026-11-01",
      cityFlow: "",
      locale: "en",
      dayCount: 8,
    });
    expect(line).toContain("8 days done");
  });
});
