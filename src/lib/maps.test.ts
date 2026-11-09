import { describe, expect, it } from "vitest";
import { googleMapsDeepLinkHref, googleMapsHref } from "@/lib/maps";

describe("googleMapsHref", () => {
  it("prefers a non-empty Google Maps URL over coordinates", () => {
    expect(
      googleMapsHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        mapsUrl: "https://maps.app.goo.gl/abc123",
      }),
    ).toBe("https://maps.app.goo.gl/abc123");
  });

  it("prefers a full place URL over coordinates", () => {
    const url =
      "https://www.google.com/maps/place/Fushimi+Inari+Taisha/@34.96714,135.77268,17z";
    expect(
      googleMapsHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        mapsUrl: url,
      }),
    ).toBe(url);
  });

  it("falls back to lat/lng when mapsUrl is empty", () => {
    expect(
      googleMapsHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        mapsUrl: "  ",
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=34.967,135.772");
  });

  it("falls back to lat/lng when mapsUrl is missing", () => {
    expect(
      googleMapsHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=34.967,135.772");
  });

  it("falls back to name search when no mapsUrl or coordinates", () => {
    expect(googleMapsHref({ name: "Fushimi Inari" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari",
    );
  });

  it("ignores non-Maps URLs and uses coordinates instead", () => {
    expect(
      googleMapsHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        mapsUrl: "https://example.com/not-maps",
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=34.967,135.772");
  });
});

describe("googleMapsDeepLinkHref", () => {
  it("wraps a preferred mapsUrl in comgooglemapsurl://", () => {
    expect(
      googleMapsDeepLinkHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
        mapsUrl: "https://maps.app.goo.gl/abc123",
      }),
    ).toBe("comgooglemapsurl://maps.app.goo.gl/abc123");
  });

  it("wraps coord search https in comgooglemapsurl://", () => {
    expect(
      googleMapsDeepLinkHref({
        name: "Fushimi Inari",
        lat: 34.967,
        lng: 135.772,
      }),
    ).toBe(
      "comgooglemapsurl://www.google.com/maps/search/?api=1&query=34.967,135.772",
    );
  });
});
