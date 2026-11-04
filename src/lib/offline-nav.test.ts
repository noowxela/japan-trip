import { describe, expect, it } from "vitest";
import { hardNavigationHref } from "@/lib/offline-nav";

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

describe("hardNavigationHref", () => {
  it("returns same-origin paths", () => {
    expect(hardNavigationHref(click(anchor({ href: "/schedule?d=1" })), ORIGIN)).toBe(
      "/schedule?d=1",
    );
  });
  it("ignores modified clicks, other origins, new tabs and hashes", () => {
    expect(
      hardNavigationHref(click(anchor({ href: "/" }), { metaKey: true }), ORIGIN),
    ).toBeNull();
    expect(
      hardNavigationHref(click(anchor({ href: "https://maps.google.com/" })), ORIGIN),
    ).toBeNull();
    expect(
      hardNavigationHref(click(anchor({ href: "/", target: "_blank" })), ORIGIN),
    ).toBeNull();
    expect(hardNavigationHref(click(anchor({ href: "#top" })), ORIGIN)).toBeNull();
    expect(hardNavigationHref(click({ closest: () => null }), ORIGIN)).toBeNull();
    expect(hardNavigationHref(click(null), ORIGIN)).toBeNull();
  });
});
