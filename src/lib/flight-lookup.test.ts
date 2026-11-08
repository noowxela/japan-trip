import { describe, expect, it } from "vitest";
import { extractFlightNumber, flightExternalHref } from "@/lib/flight-lookup";

describe("extractFlightNumber", () => {
  it("reads codes from names", () => {
    expect(extractFlightNumber("MH88")).toBe("MH88");
    expect(extractFlightNumber("MH88 KUL→HND")).toBe("MH88");
    expect(extractFlightNumber("Japan Airlines JL 12")).toBe("JL12");
    expect(extractFlightNumber("Nozomi to Kyoto")).toBeNull();
  });
});

describe("flightExternalHref", () => {
  it("uses FlightAware when a number is present", () => {
    expect(
      flightExternalHref({
        name: "MH88 KUL→HND",
        from: "KUL",
        to: "HND",
        date: "2026-10-25",
      }),
    ).toBe("https://www.flightaware.com/live/flight/MH88");
  });

  it("falls back to Google Flights search", () => {
    const href = flightExternalHref({
      name: "Morning hop",
      from: "Tokyo",
      to: "Osaka",
      date: "2026-11-02",
    });
    expect(href.startsWith("https://www.google.com/travel/flights?q=")).toBe(
      true,
    );
    expect(decodeURIComponent(href)).toContain("Tokyo");
    expect(decodeURIComponent(href)).toContain("Osaka");
    expect(decodeURIComponent(href)).toContain("2026-11-02");
  });
});
