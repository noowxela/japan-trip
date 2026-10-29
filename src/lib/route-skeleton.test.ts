import { describe, expect, it } from "vitest";
import { rootSkeletonFor } from "@/lib/route-skeleton";

describe("rootSkeletonFor", () => {
  it("uses the overview skeleton for / and unknown paths", () => {
    expect(rootSkeletonFor("/")).toBe("overview");
    expect(rootSkeletonFor(null)).toBe("overview");
    expect(rootSkeletonFor(undefined)).toBe("overview");
    expect(rootSkeletonFor("/budgets")).toBe("overview");
  });

  it("uses the budget skeleton while the budget layout loads", () => {
    expect(rootSkeletonFor("/budget")).toBe("budget");
    expect(rootSkeletonFor("/budget/abc123")).toBe("budget");
  });
});
