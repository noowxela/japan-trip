import { describe, expect, it } from "vitest";
import {
  normalizeRscCacheKey,
  RSC_WARM_MAX_AGE_MS,
  rscCacheableHeaders,
  rscCacheLookupKeys,
  rscRequestKind,
  shouldWarmRsc,
  refetchDepth,
  shallowerRscKeys,
} from "@/lib/sw-rsc-key";

function h(values: Record<string, string>) {
  return new Headers(values);
}

function tree(child: unknown) {
  return encodeURIComponent(
    JSON.stringify(["", { children: child }, null, null, true]),
  );
}

describe("refetchDepth", () => {
  it("finds the shallowest refetch marker", () => {
    expect(refetchDepth(tree(["__PAGE__", {}, null, "refetch"]))).toBe(1);
    expect(
      refetchDepth(
        tree(["budget", { children: [["id", "x", "d"], {}, null, "refetch"] }]),
      ),
    ).toBe(2);
  });
  it("treats missing, bad or marker-less headers as root", () => {
    expect(refetchDepth(null)).toBe(0);
    expect(refetchDepth("%%%")).toBe(0);
    expect(refetchDepth(tree(["schedule", {}]))).toBe(0);
  });
});

describe("rscRequestKind", () => {
  it("separates full, prefetch and segment prefetch", () => {
    expect(rscRequestKind(h({ RSC: "1" }))).toBe("full");
    expect(rscRequestKind(h({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe(
      "prefetch",
    );
    expect(
      rscRequestKind(
        h({
          RSC: "1",
          "Next-Router-Prefetch": "1",
          "Next-Router-Segment-Prefetch": "/_tree",
        }),
      ),
    ).toBe("seg:/_tree");
  });
});

describe("normalizeRscCacheKey", () => {
  it("drops the _rsc hash so keys are stable across screens", () => {
    const a = normalizeRscCacheKey(
      "https://x.test/schedule?_rsc=aaa",
      h({ RSC: "1", "Next-Router-State-Tree": tree(["schedule", {}, null, "refetch"]) }),
    );
    const b = normalizeRscCacheKey(
      "https://x.test/schedule?_rsc=bbb",
      h({ RSC: "1", "Next-Router-State-Tree": tree(["schedule", {}, null, "refetch"]) }),
    );
    expect(a).toBe(b);
    expect(a).toBe("https://x.test/schedule?__sw_rsc=full%7Cd1");
  });

  it("separates kinds and keeps other params", () => {
    expect(
      normalizeRscCacheKey(
        "https://x.test/schedule?day=3&_rsc=z",
        h({ RSC: "1", "Next-Router-Prefetch": "1" }),
      ),
    ).toBe("https://x.test/schedule?day=3&__sw_rsc=prefetch%7Cd0");
    expect(normalizeRscCacheKey("https://x.test/", h({ RSC: "1" }))).toBe(
      "https://x.test/?__sw_rsc=full%7Cd0",
    );
  });
});

describe("shallowerRscKeys", () => {
  it("lists shallower full keys down to the root", () => {
    expect(shallowerRscKeys("https://x.test/a?__sw_rsc=full%7Cd2")).toEqual([
      "https://x.test/a?__sw_rsc=full%7Cd1",
      "https://x.test/a?__sw_rsc=full%7Cd0",
    ]);
    expect(shallowerRscKeys("https://x.test/a?__sw_rsc=full%7Cd0")).toEqual([]);
    expect(shallowerRscKeys("https://x.test/a?__sw_rsc=prefetch%7Cd1")).toEqual([]);
  });
});

describe("shouldWarmRsc", () => {
  const now = Date.parse("2026-11-04T12:00:00Z");
  it("warms when missing, unreadable or old", () => {
    expect(shouldWarmRsc(null, now)).toBe(true);
    expect(shouldWarmRsc("nope", now)).toBe(true);
    expect(
      shouldWarmRsc(new Date(now - RSC_WARM_MAX_AGE_MS - 1).toUTCString(), now),
    ).toBe(true);
  });
  it("skips a fresh payload", () => {
    expect(shouldWarmRsc(new Date(now - 60_000).toUTCString(), now)).toBe(false);
  });
});

describe("rscCacheLookupKeys", () => {
  it("starts from the normalised key so shallower fallbacks work", () => {
    const url = "https://x.test/schedule?_rsc=aaa";
    const headers = h({
      RSC: "1",
      "Next-Router-State-Tree": tree(["schedule", {}, null, "refetch"]),
    });
    expect(shallowerRscKeys(url)).toEqual([]);
    expect(rscCacheLookupKeys(url, headers)).toEqual([
      "https://x.test/schedule?__sw_rsc=full%7Cd1",
      "https://x.test/schedule?__sw_rsc=full%7Cd0",
    ]);
  });
});

describe("rscCacheableHeaders", () => {
  it("strips no-store so Cache API will accept the payload", () => {
    const stored = rscCacheableHeaders(
      h({
        "content-type": "text/x-component",
        "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
        pragma: "no-cache",
        "x-matched-path": "/schedule.rsc",
      }),
    );
    expect(stored.get("cache-control")).toBeNull();
    expect(stored.get("pragma")).toBeNull();
    expect(stored.get("content-type")).toBe("text/x-component");
    expect(stored.get("x-matched-path")).toBe("/schedule.rsc");
  });
});
