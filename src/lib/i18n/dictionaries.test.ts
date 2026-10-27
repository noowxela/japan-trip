import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/dictionaries";

describe("t()", () => {
  it("interpolates variables", () => {
    expect(t("en", "schedule.pendingCount", { n: 3 })).toBe("3 pending");
    expect(t("zh", "schedule.pendingCount", { n: 3 })).toBe("3 个待定");
  });

  it("falls back zh → en → key", () => {
    expect(t("zh", "nav.overview")).toBe("总览");
    expect(t("en", "nav.overview")).toBe("Overview");
    expect(t("zh", "does.not.exist")).toBe("does.not.exist");
  });
});
