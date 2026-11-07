import { describe, expect, it } from "vitest";
import {
  isGoogleMapsUrl,
  mapsSearchUrl,
  parseGoogleMapsLocation,
} from "@/lib/maps-url";

describe("isGoogleMapsUrl", () => {
  it("accepts full, regional, and short Maps links", () => {
    expect(isGoogleMapsUrl("https://www.google.com/maps/place/Kyoto")).toBe(true);
    expect(
      isGoogleMapsUrl("https://www.google.co.jp/maps/place/伏見稲荷大社/"),
    ).toBe(true);
    expect(isGoogleMapsUrl("https://maps.google.com/?q=34.96,135.77")).toBe(true);
    expect(isGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isGoogleMapsUrl("https://goo.gl/maps/abc123")).toBe(true);
  });

  it("rejects unrelated URLs and plain text", () => {
    expect(isGoogleMapsUrl("https://nominatim.openstreetmap.org/search")).toBe(
      false,
    );
    expect(isGoogleMapsUrl("Fushimi Inari")).toBe(false);
    expect(isGoogleMapsUrl("https://www.google.com/search?q=kyoto")).toBe(false);
  });
});

describe("parseGoogleMapsLocation", () => {
  it("prefers place pin !3d/!4d over camera @ coordinates", () => {
    const parsed = parseGoogleMapsLocation(
      "https://www.google.com/maps/place/Fushimi+Inari+Taisha/@35.00000,136.00000,17z/data=!3m1!4b1!8m2!3d34.96714!4d135.77268",
    );
    expect(parsed).toEqual({
      lat: 34.96714,
      lng: 135.77268,
      name: "Fushimi Inari Taisha",
    });
  });

  it("reads api query coordinates", () => {
    expect(
      parseGoogleMapsLocation(
        "https://www.google.com/maps/search/?api=1&query=34.96714,135.77268",
      ),
    ).toMatchObject({ lat: 34.96714, lng: 135.77268 });
  });

  it("reads q= coordinates and place names", () => {
    expect(
      parseGoogleMapsLocation("https://maps.google.com/?q=34.96714,135.77268"),
    ).toMatchObject({ lat: 34.96714, lng: 135.77268 });
    expect(
      parseGoogleMapsLocation(
        "https://www.google.com/maps?q=Kiyomizu-dera",
      ),
    ).toMatchObject({ lat: null, lng: null, name: "Kiyomizu-dera" });
  });

  it("falls back to @ camera coordinates when no pin is present", () => {
    expect(
      parseGoogleMapsLocation("https://www.google.com/maps/@34.99486,135.78504,17z"),
    ).toMatchObject({ lat: 34.99486, lng: 135.78504 });
  });

  it("decodes percent-encoded pin coordinates and Japanese names", () => {
    const parsed = parseGoogleMapsLocation(
      "https://www.google.co.jp/maps/place/%E4%BC%8F%E8%A6%8B%E7%A8%B2%E8%8D%B7%E5%A4%A7%E7%A4%BE/@34.9,135.7,17z/data=%213d34.96714%214d135.77268",
    );
    expect(parsed.lat).toBe(34.96714);
    expect(parsed.lng).toBe(135.77268);
    expect(parsed.name).toBe("伏見稲荷大社");
  });

  it("does not invent coordinates for a short link", () => {
    expect(parseGoogleMapsLocation("https://maps.app.goo.gl/abc123")).toEqual({
      lat: null,
      lng: null,
      name: null,
    });
  });
});

describe("mapsSearchUrl", () => {
  it("builds a stable coordinate search URL", () => {
    expect(mapsSearchUrl(34.96714, 135.77268)).toBe(
      "https://www.google.com/maps/search/?api=1&query=34.96714,135.77268",
    );
  });
});
