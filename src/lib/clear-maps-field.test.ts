import { describe, expect, it } from "vitest";
import { clearMapsFieldState } from "@/lib/clear-maps-field";

describe("clearMapsFieldState", () => {
  it("wipes mapsUrl and lat/lng so a stale pin is not kept", () => {
    expect(clearMapsFieldState()).toEqual({
      mapsUrl: "",
      lat: null,
      lng: null,
    });
  });
});
