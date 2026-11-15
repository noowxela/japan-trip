import { describe, expect, it } from "vitest";
import { coordsOfStay } from "@/lib/geocode";

describe("coordsOfStay", () => {
  it("prefers stored lat/lng over landmark name matches", () => {
    expect(
      coordsOfStay({
        name: "Fushimi Inari",
        address: "",
        lat: 35.5,
        lng: 139.5,
      }),
    ).toEqual({ lat: 35.5, lng: 139.5 });
  });

  it("falls back to landmark lookup when coords are missing", () => {
    const coords = coordsOfStay({ name: "Fushimi Inari", address: "" });
    expect(coords?.lat).toBeCloseTo(34.96714, 4);
    expect(coords?.lng).toBeCloseTo(135.77268, 4);
  });
});
