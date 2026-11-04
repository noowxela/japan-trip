import { describe, expect, it } from "vitest";
import {
  SERVED_FROM_CACHE_MESSAGE,
  isServedFromCacheMessage,
  staleSinceIso,
} from "@/lib/offline-status";

describe("isServedFromCacheMessage", () => {
  it("accepts only the SW message shape", () => {
    expect(
      isServedFromCacheMessage({
        type: SERVED_FROM_CACHE_MESSAGE,
        url: "https://x.test/",
        cachedAt: null,
      }),
    ).toBe(true);
    expect(isServedFromCacheMessage({ type: "SKIP_WAITING" })).toBe(false);
    expect(isServedFromCacheMessage(null)).toBe(false);
    expect(isServedFromCacheMessage({ type: SERVED_FROM_CACHE_MESSAGE })).toBe(
      false,
    );
  });
});

describe("staleSinceIso", () => {
  it("prefers the cached response Date header", () => {
    expect(
      staleSinceIso("Wed, 04 Nov 2026 14:30:00 GMT", "2026-11-01T00:00:00.000Z"),
    ).toBe("2026-11-04T14:30:00.000Z");
  });
  it("falls back to the snapshot time, then null", () => {
    expect(staleSinceIso("garbage", "2026-11-01T00:00:00.000Z")).toBe(
      "2026-11-01T00:00:00.000Z",
    );
    expect(staleSinceIso(null, null)).toBeNull();
    expect(staleSinceIso(undefined, "nope")).toBeNull();
  });
});
