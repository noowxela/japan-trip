import { describe, expect, it } from "vitest";
import {
  clampSheetHeight,
  cycleSnap,
  nearestSnap,
  pushSample,
  releaseSnap,
  releaseVelocity,
  type VelocitySample,
} from "./sheet-drag";

const SNAPS = [0.14, 0.5, 0.92] as const;

describe("nearestSnap", () => {
  it("picks the closest fraction", () => {
    expect(nearestSnap(SNAPS, 0)).toBe(0);
    expect(nearestSnap(SNAPS, 0.3)).toBe(0);
    expect(nearestSnap(SNAPS, 0.33)).toBe(1);
    expect(nearestSnap(SNAPS, 0.7)).toBe(1);
    expect(nearestSnap(SNAPS, 0.72)).toBe(2);
    expect(nearestSnap(SNAPS, 1)).toBe(2);
  });
});

describe("clampSheetHeight", () => {
  it("clamps to first/last snap of the root", () => {
    expect(clampSheetHeight(SNAPS, 10, 1000)).toBe(140);
    expect(clampSheetHeight(SNAPS, 2000, 1000)).toBe(920);
    expect(clampSheetHeight(SNAPS, 500, 1000)).toBe(500);
  });
  it("passes through when the root is unmeasured", () => {
    expect(clampSheetHeight(SNAPS, 42, 0)).toBe(42);
  });
});

describe("velocity", () => {
  it("keeps only recent samples (min two)", () => {
    let s: VelocitySample[] = [];
    for (const t of [0, 50, 100, 150, 200]) s = pushSample(s, { t, y: 500 - t });
    expect(s.map((x) => x.t)).toEqual([100, 150, 200]);
    expect(pushSample([{ t: 0, y: 0 }], { t: 1000, y: 10 })).toHaveLength(2);
  });
  it("is positive when the finger moves up", () => {
    expect(releaseVelocity([{ t: 0, y: 500 }, { t: 50, y: 450 }])).toBe(1);
    expect(releaseVelocity([{ t: 0, y: 450 }, { t: 50, y: 500 }])).toBe(-1);
  });
  it("is zero with too few samples, zero dt, or a pause before release", () => {
    expect(releaseVelocity([])).toBe(0);
    expect(releaseVelocity([{ t: 5, y: 1 }, { t: 5, y: 90 }])).toBe(0);
    expect(releaseVelocity([{ t: 0, y: 500 }, { t: 50, y: 450 }], 400)).toBe(0);
  });
});

describe("releaseSnap", () => {
  it("slow release goes to the nearest snap", () => {
    expect(releaseSnap(SNAPS, 1, 0.45, 0.1)).toBe(1);
    expect(releaseSnap(SNAPS, 1, 0.2, -0.1)).toBe(0);
  });
  it("fast flick moves one step in the flick direction", () => {
    expect(releaseSnap(SNAPS, 1, 0.52, 1.2)).toBe(2);
    expect(releaseSnap(SNAPS, 1, 0.48, -1.2)).toBe(0);
    expect(releaseSnap(SNAPS, 0, 0.16, 0.8)).toBe(1);
  });
  it("a flick never undoes a drag that already passed the next snap", () => {
    expect(releaseSnap(SNAPS, 0, 0.9, 1)).toBe(2);
  });
  it("clamps at the ends", () => {
    expect(releaseSnap(SNAPS, 2, 0.92, 2)).toBe(2);
    expect(releaseSnap(SNAPS, 0, 0.14, -2)).toBe(0);
  });
});

describe("cycleSnap", () => {
  it("steps up and wraps", () => {
    expect([0, 1, 2].map((i) => cycleSnap(SNAPS, i))).toEqual([1, 2, 0]);
  });
});
