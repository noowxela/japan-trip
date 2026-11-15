import { describe, expect, it } from "vitest";
import { overviewHardNavHref } from "@/lib/overview-hard-nav";

const ORIGIN = "https://x.test";

function anchor(attrs: Record<string, string>) {
  return {
    closest: () => ({
      getAttribute: (name: string) => attrs[name] ?? null,
      href: attrs.href ? new URL(attrs.href, ORIGIN).toString() : "",
    }),
  };
}

function click(target: unknown, extra: Partial<MouseEvent> = {}) {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...extra,
    target: target as EventTarget,
  };
}

describe("overviewHardNavHref", () => {
  it("full-loads in-app links only while on Overview", () => {
    expect(
      overviewHardNavHref(click(anchor({ href: "/schedule" })), ORIGIN, "/"),
    ).toBe("/schedule");
    expect(
      overviewHardNavHref(
        click(anchor({ href: "/schedule?day=abc" })),
        ORIGIN,
        "/",
      ),
    ).toBe("/schedule?day=abc");
    expect(
      overviewHardNavHref(click(anchor({ href: "/budget" })), ORIGIN, "/"),
    ).toBe("/budget");
    expect(
      overviewHardNavHref(click(anchor({ href: "/phrases" })), ORIGIN, "/"),
    ).toBe("/phrases");
  });

  it("leaves Overview-to-Overview and other routes alone", () => {
    expect(
      overviewHardNavHref(click(anchor({ href: "/" })), ORIGIN, "/"),
    ).toBeNull();
    expect(
      overviewHardNavHref(click(anchor({ href: "/#top" })), ORIGIN, "/"),
    ).toBeNull();
    expect(
      overviewHardNavHref(click(anchor({ href: "/schedule" })), ORIGIN, "/budget"),
    ).toBeNull();
  });

  it("ignores modified clicks and external links", () => {
    expect(
      overviewHardNavHref(
        click(anchor({ href: "/schedule" }), { metaKey: true }),
        ORIGIN,
        "/",
      ),
    ).toBeNull();
    expect(
      overviewHardNavHref(
        click(anchor({ href: "https://maps.google.com/" })),
        ORIGIN,
        "/",
      ),
    ).toBeNull();
  });
});
