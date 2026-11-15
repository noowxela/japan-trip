import { describe, expect, it } from "vitest";
import {
  MAX_PATHS,
  MAX_VISITORS,
  VISIT_DEBOUNCE_MS,
  VISITOR_TTL_MS,
  clientIp,
  formatGeo,
  isBotUserAgent,
  isSensitiveCookieName,
  isValidVisitorId,
  maskCookieValue,
  parseUserAgent,
  parseVercelGeo,
  shouldLogVisit,
  upsertVisitorRecord,
  type VisitorRecord,
} from "@/lib/visitor";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

function record(partial: Partial<VisitorRecord> & { id: string }): VisitorRecord {
  return {
    firstSeen: "2026-11-01T00:00:00.000Z",
    lastSeen: "2026-11-01T00:00:00.000Z",
    visitCount: 1,
    lastIp: null,
    geo: null,
    device: null,
    os: null,
    browser: null,
    language: null,
    referer: null,
    paths: ["/"],
    editorUnlocked: false,
    editorName: null,
    ...partial,
  };
}

describe("isValidVisitorId", () => {
  it("accepts a UUID and rejects junk", () => {
    expect(isValidVisitorId("2c4a6e8a-1b3d-4f70-9abc-1234567890ab")).toBe(true);
    expect(isValidVisitorId("not-a-uuid")).toBe(false);
    expect(isValidVisitorId("")).toBe(false);
    expect(isValidVisitorId(undefined)).toBe(false);
  });
});

describe("shouldLogVisit", () => {
  it("logs ordinary page and curl GET requests", () => {
    expect(shouldLogVisit({ pathname: "/", method: "GET", userAgent: "curl/8.5.0" })).toBe(
      true,
    );
    expect(
      shouldLogVisit({ pathname: "/settings", method: "GET", userAgent: IPHONE_UA }),
    ).toBe(true);
  });

  it("skips API, static assets, non-GET, bots, and prefetches", () => {
    expect(shouldLogVisit({ pathname: "/api/version", method: "GET" })).toBe(false);
    expect(shouldLogVisit({ pathname: "/favicon.ico", method: "GET" })).toBe(false);
    expect(shouldLogVisit({ pathname: "/icon.png", method: "GET" })).toBe(false);
    expect(shouldLogVisit({ pathname: "/opengraph-image", method: "GET" })).toBe(false);
    expect(shouldLogVisit({ pathname: "/settings", method: "POST" })).toBe(false);
    expect(
      shouldLogVisit({
        pathname: "/",
        method: "GET",
        userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://google.com/bot.html)",
      }),
    ).toBe(false);
    expect(
      shouldLogVisit({
        pathname: "/budget",
        method: "GET",
        userAgent: IPHONE_UA,
        headers: { "Next-Router-Prefetch": "1" },
      }),
    ).toBe(false);
    expect(
      shouldLogVisit({
        pathname: "/budget",
        method: "GET",
        userAgent: IPHONE_UA,
        headers: { Purpose: "prefetch" },
      }),
    ).toBe(false);
  });

  it("logs client-side RSC navigations that are not prefetches", () => {
    expect(
      shouldLogVisit({
        pathname: "/budget",
        method: "GET",
        userAgent: IPHONE_UA,
        headers: { RSC: "1" },
      }),
    ).toBe(true);
  });
});

describe("isBotUserAgent", () => {
  it("flags crawlers but not curl or Safari", () => {
    expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(isBotUserAgent("vercel-screenshot/1.0")).toBe(true);
    expect(isBotUserAgent("curl/8.5.0")).toBe(false);
    expect(isBotUserAgent(IPHONE_UA)).toBe(false);
  });
});

describe("parseUserAgent", () => {
  it("parses iPhone Safari", () => {
    expect(parseUserAgent(IPHONE_UA)).toEqual({
      device: "iPhone",
      os: "iOS 18.1",
      browser: "Safari 18",
    });
  });

  it("parses Android Chrome and curl", () => {
    expect(
      parseUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
    ).toEqual({
      device: "Pixel 8",
      os: "Android 14",
      browser: "Chrome 120",
    });
    expect(parseUserAgent("curl/8.5.0")).toEqual({
      device: "curl",
      os: null,
      browser: "curl 8.5.0",
    });
  });
});

describe("geo and ip", () => {
  it("decodes Vercel city and takes the first forwarded IP", () => {
    expect(
      parseVercelGeo({
        "x-vercel-ip-city": "Kuala%20Lumpur",
        "x-vercel-ip-country": "MY",
        "x-vercel-ip-country-region": "14",
      }),
    ).toEqual({
      city: "Kuala Lumpur",
      country: "MY",
      region: "14",
    });
    expect(formatGeo({ city: "Tokyo", country: "JP", region: null })).toBe(
      "Tokyo, JP",
    );
    expect(clientIp({ "x-forwarded-for": "203.0.113.9, 127.0.0.1" })).toBe(
      "203.0.113.9",
    );
  });
});

describe("cookie masking", () => {
  it("hides editor and auth cookies but not lang, theme, or visitor id", () => {
    expect(isSensitiveCookieName("trip_editor")).toBe(true);
    expect(isSensitiveCookieName("session")).toBe(true);
    expect(isSensitiveCookieName("trip_visitor")).toBe(false);
    expect(isSensitiveCookieName("lang")).toBe(false);
    expect(isSensitiveCookieName("theme")).toBe(false);
    expect(maskCookieValue("trip_editor", "signed-token")).toBe("••••");
    expect(maskCookieValue("lang", "zh")).toBe("zh");
  });
});

describe("upsertVisitorRecord", () => {
  const id = "2c4a6e8a-1b3d-4f70-9abc-1234567890ab";

  it("creates, increments, and prepends new paths", () => {
    const first = upsertVisitorRecord([], {
      id,
      path: "/",
      at: "2026-11-15T00:00:00.000Z",
      ip: "203.0.113.9",
    });
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      visitCount: 1,
      paths: ["/"],
      lastIp: "203.0.113.9",
    });

    const second = upsertVisitorRecord(first, {
      id,
      path: "/settings",
      at: "2026-11-15T01:00:00.000Z",
    });
    expect(second[0]).toMatchObject({
      visitCount: 2,
      firstSeen: "2026-11-15T00:00:00.000Z",
      lastSeen: "2026-11-15T01:00:00.000Z",
      paths: ["/settings", "/"],
    });
  });

  it("does not increment a debounced repeat of the same path", () => {
    const start = "2026-11-15T00:00:00.000Z";
    const first = upsertVisitorRecord([], { id, path: "/settings", at: start });
    const soon = new Date(Date.parse(start) + VISIT_DEBOUNCE_MS - 1).toISOString();
    const debounced = upsertVisitorRecord(first, { id, path: "/settings", at: soon });
    expect(debounced[0]?.visitCount).toBe(1);
    expect(debounced[0]?.paths).toEqual(["/settings"]);
  });

  it("caps recent paths and total visitors, and drops stale rows", () => {
    const paths = Array.from({ length: MAX_PATHS }, (_, i) => `/p${i}`);
    const seeded = upsertVisitorRecord(
      [record({ id, paths: [...paths].reverse(), visitCount: MAX_PATHS })],
      { id, path: "/newest", at: "2026-11-15T00:00:00.000Z" },
    );
    expect(seeded[0]?.paths).toHaveLength(MAX_PATHS);
    expect(seeded[0]?.paths[0]).toBe("/newest");
    expect(seeded[0]?.paths).not.toContain("/p0");

    const staleAt = new Date(Date.parse("2026-11-15T00:00:00.000Z") - VISITOR_TTL_MS - 1).toISOString();
    const pruned = upsertVisitorRecord(
      [record({ id: "aaaaaaaa-1b3d-4f70-9abc-1234567890ab", lastSeen: staleAt })],
      { id, path: "/", at: "2026-11-15T00:00:00.000Z" },
    );
    expect(pruned.map((row) => row.id)).toEqual([id]);

    const many = Array.from({ length: MAX_VISITORS }, (_, i) =>
      record({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        lastSeen: `2026-11-14T00:00:${String(i % 60).padStart(2, "0")}.000Z`,
      }),
    );
    const capped = upsertVisitorRecord(many, {
      id,
      path: "/",
      at: "2026-11-15T00:00:00.000Z",
    });
    expect(capped).toHaveLength(MAX_VISITORS);
    expect(capped[0]?.id).toBe(id);
  });

  it("remembers an editor name once seen", () => {
    const first = upsertVisitorRecord([], {
      id,
      path: "/",
      at: "2026-11-15T00:00:00.000Z",
      editorUnlocked: true,
      editorName: "Alex",
    });
    const later = upsertVisitorRecord(first, {
      id,
      path: "/settings",
      at: "2026-11-15T02:00:00.000Z",
      editorUnlocked: false,
      editorName: null,
    });
    expect(later[0]).toMatchObject({
      editorUnlocked: true,
      editorName: "Alex",
    });
  });
});
