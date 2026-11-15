import { describe, expect, it } from "vitest";
import {
  PULL_THRESHOLD_PX,
  pullDistance,
  pulledOffset,
  shouldReleaseRefresh,
} from "@/lib/pull-refresh";

describe("pullDistance", () => {
  it("only counts a downward pull when already at the top", () => {
    expect(pullDistance(80, 140, 0)).toBe(60);
    expect(pullDistance(80, 40, 0)).toBe(0);
    expect(pullDistance(80, 200, 12)).toBe(0);
  });
});

describe("shouldReleaseRefresh", () => {
  it("arms once the pull reaches the threshold", () => {
    expect(shouldReleaseRefresh(PULL_THRESHOLD_PX - 1)).toBe(false);
    expect(shouldReleaseRefresh(PULL_THRESHOLD_PX)).toBe(true);
    expect(shouldReleaseRefresh(PULL_THRESHOLD_PX + 20)).toBe(true);
  });
});

describe("pulledOffset", () => {
  it("maps 1:1 up to the threshold, then resists", () => {
    expect(pulledOffset(0)).toBe(0);
    expect(pulledOffset(40)).toBe(40);
    expect(pulledOffset(PULL_THRESHOLD_PX)).toBe(PULL_THRESHOLD_PX);
    expect(pulledOffset(PULL_THRESHOLD_PX + 40)).toBe(
      PULL_THRESHOLD_PX + 40 * 0.35,
    );
  });
});
