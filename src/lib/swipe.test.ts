import { describe, expect, it } from "vitest";
import {
  SWIPE_AXIS_LOCK_PX,
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_MIN_OFFSET_PX,
  SWIPE_VELOCITY_PX_MS,
  commitSwipeDirection,
  decideSwipeAxis,
  rubberBandOffset,
  shouldSuppressClick,
} from "@/lib/swipe";

describe("decideSwipeAxis", () => {
  it("stays none under lock", () => {
    expect(decideSwipeAxis(0, 0)).toBe("none");
    expect(decideSwipeAxis(SWIPE_AXIS_LOCK_PX - 1, 0)).toBe("none");
    expect(decideSwipeAxis(0, SWIPE_AXIS_LOCK_PX - 1)).toBe("none");
  });

  it("locks horizontal when |dx| > |dy| past lock", () => {
    expect(decideSwipeAxis(20, 5)).toBe("horizontal");
    expect(decideSwipeAxis(-30, 10)).toBe("horizontal");
  });

  it("locks vertical when |dy| >= |dx| past lock", () => {
    expect(decideSwipeAxis(5, 20)).toBe("vertical");
    expect(decideSwipeAxis(12, 12)).toBe("vertical");
  });
});

describe("rubberBandOffset", () => {
  it("passes through within limit", () => {
    expect(rubberBandOffset(40, 88)).toBe(40);
    expect(rubberBandOffset(-40, 88)).toBe(-40);
  });

  it("damps beyond limit", () => {
    expect(rubberBandOffset(100, 88, 0.35)).toBeCloseTo(88 + 12 * 0.35);
    expect(rubberBandOffset(-100, 88, 0.35)).toBeCloseTo(-(88 + 12 * 0.35));
  });
});

describe("commitSwipeDirection", () => {
  it("commits by distance", () => {
    expect(
      commitSwipeDirection({ offset: SWIPE_THRESHOLD_PX, velocity: 0 }),
    ).toBe("right");
    expect(
      commitSwipeDirection({ offset: -SWIPE_THRESHOLD_PX, velocity: 0 }),
    ).toBe("left");
  });

  it("commits by velocity below distance threshold when travel is enough", () => {
    expect(
      commitSwipeDirection({
        offset: SWIPE_VELOCITY_MIN_OFFSET_PX,
        velocity: SWIPE_VELOCITY_PX_MS,
      }),
    ).toBe("right");
    expect(
      commitSwipeDirection({
        offset: -SWIPE_VELOCITY_MIN_OFFSET_PX,
        velocity: -SWIPE_VELOCITY_PX_MS,
      }),
    ).toBe("left");
  });

  it("rejects velocity-only commits that are too short", () => {
    expect(
      commitSwipeDirection({
        offset: SWIPE_VELOCITY_MIN_OFFSET_PX - 1,
        velocity: SWIPE_VELOCITY_PX_MS,
      }),
    ).toBeNull();
    expect(
      commitSwipeDirection({
        offset: -(SWIPE_VELOCITY_MIN_OFFSET_PX - 1),
        velocity: -SWIPE_VELOCITY_PX_MS,
      }),
    ).toBeNull();
  });

  it("rejects velocity whose sign disagrees with offset", () => {
    expect(
      commitSwipeDirection({
        offset: SWIPE_VELOCITY_MIN_OFFSET_PX,
        velocity: -SWIPE_VELOCITY_PX_MS,
      }),
    ).toBeNull();
    expect(
      commitSwipeDirection({
        offset: -SWIPE_VELOCITY_MIN_OFFSET_PX,
        velocity: SWIPE_VELOCITY_PX_MS,
      }),
    ).toBeNull();
  });

  it("returns null when short and slow", () => {
    expect(
      commitSwipeDirection({
        offset: 30,
        velocity: 0.1,
      }),
    ).toBeNull();
  });
});

describe("shouldSuppressClick", () => {
  it("suppresses after swipe/drag", () => {
    expect(shouldSuppressClick(true)).toBe(true);
    expect(shouldSuppressClick(false)).toBe(false);
  });
});
