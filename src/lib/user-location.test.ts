import { describe, expect, it } from "vitest";
import {
  accuracyRadiusMeters,
  geolocationErrorKind,
  isGeolocationAvailable,
  userLocationFromCoords,
} from "@/lib/user-location";

describe("userLocationFromCoords", () => {
  it("accepts a normal fix", () => {
    expect(
      userLocationFromCoords({
        latitude: 34.6687,
        longitude: 135.5013,
        accuracy: 18,
      }),
    ).toEqual({ lat: 34.6687, lng: 135.5013, accuracy: 18 });
  });

  it("rejects non-finite or out-of-range coords", () => {
    expect(
      userLocationFromCoords({ latitude: NaN, longitude: 135 }),
    ).toBeNull();
    expect(
      userLocationFromCoords({ latitude: 91, longitude: 135 }),
    ).toBeNull();
    expect(
      userLocationFromCoords({ latitude: 34, longitude: 200 }),
    ).toBeNull();
  });

  it("treats bad accuracy as null", () => {
    expect(
      userLocationFromCoords({
        latitude: 34,
        longitude: 135,
        accuracy: -1,
      }),
    ).toEqual({ lat: 34, lng: 135, accuracy: null });
  });
});

describe("accuracyRadiusMeters", () => {
  it("clamps to a readable ring", () => {
    expect(accuracyRadiusMeters(null)).toBeNull();
    expect(accuracyRadiusMeters(3)).toBe(12);
    expect(accuracyRadiusMeters(40)).toBe(40);
    expect(accuracyRadiusMeters(900)).toBe(250);
  });
});

describe("geolocationErrorKind", () => {
  it("maps permission denied separately", () => {
    expect(geolocationErrorKind({ code: 1 })).toBe("denied");
    expect(geolocationErrorKind({ code: 2 })).toBe("unavailable");
    expect(geolocationErrorKind({ code: 3 })).toBe("unavailable");
    expect(geolocationErrorKind(null)).toBe("unavailable");
  });
});

describe("isGeolocationAvailable", () => {
  it("requires watchPosition", () => {
    expect(isGeolocationAvailable(null)).toBe(false);
    expect(
      isGeolocationAvailable({
        watchPosition: () => 0,
      } as unknown as Geolocation),
    ).toBe(true);
  });
});
