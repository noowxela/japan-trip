import { describe, expect, it } from "vitest";
import {
  datePickerAnchorsEqual,
  getViewportSize,
  placeDatePicker,
} from "@/lib/date-picker";

const IPHONE_SE = { width: 375, height: 667 };
const IPHONE = { width: 375, height: 812 };

describe("placeDatePicker", () => {
  it("opens below the button when there is room", () => {
    const placed = placeDatePicker({
      button: { top: 120, left: 16, bottom: 156, width: 343 },
      panelHeight: 360,
      viewport: IPHONE,
    });
    expect(placed.origin).toBe("top");
    expect(placed.top).toBe(164);
    expect(placed.left).toBe(16);
    expect(placed.width).toBe(343);
  });

  it("opens above and stays on-screen when the button is near the bottom", () => {
    const placed = placeDatePicker({
      button: { top: 620, left: 16, bottom: 656, width: 343 },
      panelHeight: 360,
      viewport: IPHONE,
    });
    expect(placed.origin).toBe("bottom");
    expect(placed.top).toBeGreaterThanOrEqual(16);
    expect(placed.top + 360).toBeLessThanOrEqual(IPHONE.height - 16);
    expect(placed.left).toBeGreaterThanOrEqual(16);
    expect(placed.left + placed.width).toBeLessThanOrEqual(IPHONE.width - 16);
  });

  it("clamps a 360px panel onto an iPhone SE screen when space is tight on both sides", () => {
    const placed = placeDatePicker({
      button: { top: 280, left: 8, bottom: 316, width: 359 },
      panelHeight: 360,
      viewport: IPHONE_SE,
    });
    expect(placed.top).toBeGreaterThanOrEqual(16);
    expect(placed.top).toBeLessThanOrEqual(IPHONE_SE.height - 16 - 360);
    expect(placed.width).toBeLessThanOrEqual(IPHONE_SE.width - 32);
    expect(placed.left).toBeGreaterThanOrEqual(16);
    expect(placed.left + placed.width).toBeLessThanOrEqual(IPHONE_SE.width - 16);
  });
});

describe("getViewportSize", () => {
  it("prefers the visual viewport used by iOS PWAs", () => {
    expect(
      getViewportSize({
        innerWidth: 375,
        innerHeight: 812,
        visualViewport: { width: 375, height: 700 } as VisualViewport,
      }),
    ).toEqual({ width: 375, height: 700 });
  });
});

describe("datePickerAnchorsEqual", () => {
  it("ignores sub-pixel jitter so scroll sync does not retrigger renders", () => {
    const a = { top: 20, left: 16, width: 343, origin: "top" as const };
    expect(datePickerAnchorsEqual(a, { ...a, top: 20.2 })).toBe(true);
    expect(datePickerAnchorsEqual(a, { ...a, top: 21 })).toBe(false);
    expect(datePickerAnchorsEqual(null, a)).toBe(false);
  });
});
