import { describe, expect, it } from "vitest";
import { placeSpendContextMenu } from "@/lib/spend-item-menu";

const viewport = { width: 390, height: 844 };

describe("placeSpendContextMenu", () => {
  it("puts the menu below when there is room", () => {
    const layout = placeSpendContextMenu({
      anchor: { top: 120, left: 16, width: 358, height: 44 },
      menuHeight: 200,
      viewport,
    });
    expect(layout.menu.placement).toBe("below");
    expect(layout.preview.top).toBe(120);
    expect(layout.preview.left).toBe(16);
    expect(layout.preview.width).toBe(358);
    expect(layout.menu.top).toBeCloseTo(120 + 44 * 1.04 + 8);
    expect(layout.menu.width).toBe(280);
    expect(layout.scale).toBe(1.04);
  });

  it("puts the menu above when the row is near the bottom", () => {
    const layout = placeSpendContextMenu({
      anchor: { top: 760, left: 16, width: 358, height: 44 },
      menuHeight: 200,
      viewport,
    });
    expect(layout.menu.placement).toBe("above");
    expect(layout.preview.top).toBe(760);
    expect(layout.menu.top + 200 + 8).toBeCloseTo(layout.preview.top);
  });

  it("shifts the preview up when neither side has enough room", () => {
    const layout = placeSpendContextMenu({
      anchor: { top: 100, left: 16, width: 358, height: 44 },
      menuHeight: 280,
      viewport: { width: 390, height: 400 },
      padding: 16,
    });
    expect(layout.menu.placement).toBe("below");
    expect(layout.preview.top).toBeLessThan(100);
    expect(layout.menu.top + 280).toBeLessThanOrEqual(400 - 16);
  });

  it("clamps a row that overflows the viewport horizontally", () => {
    const layout = placeSpendContextMenu({
      anchor: { top: 100, left: -20, width: 500, height: 44 },
      menuHeight: 180,
      viewport,
    });
    expect(layout.preview.left).toBe(16);
    expect(layout.preview.width).toBe(390 - 32);
    expect(layout.menu.left).toBe(16);
    expect(layout.menu.width).toBe(280);
  });
});
