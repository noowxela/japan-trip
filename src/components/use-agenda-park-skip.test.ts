import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/dictionaries";
import { pendingMoveToastMessage } from "@/components/use-agenda-park-skip";

describe("pendingMoveToastMessage", () => {
  it("includes the old time for a single timed place", () => {
    expect(
      pendingMoveToastMessage((key, vars) => t("en", key, vars), {
        count: 1,
        time: "09:30",
      }),
    ).toBe("Moved to pending · was 09:30");
    expect(
      pendingMoveToastMessage((key, vars) => t("zh", key, vars), {
        count: 1,
        time: "09:30",
      }),
    ).toBe("已移到待定 · 原时间 09:30");
  });

  it("notes unchanged transit in a mixed batch", () => {
    expect(
      pendingMoveToastMessage((key, vars) => t("zh", key, vars), {
        count: 2,
        transitLeft: 1,
      }),
    ).toBe("已将 2 项移到待定 · 1 项交通未改");
  });
});
