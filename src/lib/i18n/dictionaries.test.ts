import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/dictionaries";

describe("t()", () => {
  it("interpolates variables", () => {
    expect(t("en", "schedule.pendingCount", { n: 3 })).toBe("3 pending");
    expect(t("zh", "schedule.pendingCount", { n: 3 })).toBe("3 个待定");
    expect(t("en", "schedule.skippedCount", { n: 2 })).toBe("2 skipped");
    expect(t("zh", "schedule.skippedCount", { n: 2 })).toBe("2 个跳过");
    expect(t("en", "schedule.pendingAndSkippedCount", { n: 3, m: 2 })).toBe(
      "3 pending · 2 skipped",
    );
    expect(t("zh", "schedule.pendingAndSkippedCount", { n: 3, m: 2 })).toBe(
      "3 个待定 · 2 个跳过",
    );
  });

  it("falls back zh → en → key", () => {
    expect(t("zh", "nav.overview")).toBe("总览");
    expect(t("en", "nav.overview")).toBe("Overview");
    expect(t("zh", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("agenda.editItem", () => {
  it("has zh and en copy", () => {
    expect(t("en", "agenda.editItem")).toBe("Edit stop");
    expect(t("zh", "agenda.editItem")).toBe("编辑行程");
  });
});
