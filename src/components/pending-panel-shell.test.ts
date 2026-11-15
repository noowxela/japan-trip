import { describe, expect, it } from "vitest";
import { pendingPanelShellClass } from "@/components/day-agenda-board";

describe("pendingPanelShellClass", () => {
  it("keeps modal presentation visible on every breakpoint", () => {
    const cls = pendingPanelShellClass("modal");
    expect(cls).toContain("rounded-2xl");
    expect(cls).not.toMatch(/\bhidden\b/);
    expect(cls).not.toContain("lg:hidden");
  });

  it("hides the desktop sidebar on small screens", () => {
    const cls = pendingPanelShellClass("sidebar");
    expect(cls).toMatch(/\bhidden\b/);
    expect(cls).toContain("lg:block");
  });

  it("hides the mobile sheet on large screens", () => {
    const cls = pendingPanelShellClass("sheet");
    expect(cls).toContain("lg:hidden");
    expect(cls).not.toMatch(/(?:^|\s)hidden(?:\s|$)/);
  });
});
