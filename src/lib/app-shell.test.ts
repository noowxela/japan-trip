import { describe, expect, it } from "vitest";
import {
  isStandaloneDisplay,
  shouldHandleEdgeBackSwipe,
} from "@/lib/app-shell";

describe("isStandaloneDisplay", () => {
  it("is true for standalone or fullscreen display-mode", () => {
    expect(
      isStandaloneDisplay((query) => ({ matches: query.includes("standalone") })),
    ).toBe(true);
    expect(
      isStandaloneDisplay((query) => ({ matches: query.includes("fullscreen") })),
    ).toBe(true);
  });

  it("falls back to iOS navigator.standalone", () => {
    expect(
      isStandaloneDisplay(() => ({ matches: false }), { standalone: true }),
    ).toBe(true);
    expect(
      isStandaloneDisplay(() => ({ matches: false }), { standalone: false }),
    ).toBe(false);
  });
});

describe("shouldHandleEdgeBackSwipe", () => {
  it("only handles the custom edge swipe in an installed PWA", () => {
    expect(shouldHandleEdgeBackSwipe(true)).toBe(true);
    expect(shouldHandleEdgeBackSwipe(false)).toBe(false);
  });
});
