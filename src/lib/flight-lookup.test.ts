import { describe, expect, it, vi } from "vitest";
import {
  extractFlightNumber,
  flightExternalHref,
  lookupFlightByNumber,
  suggestedFlightName,
} from "@/lib/flight-lookup";

describe("extractFlightNumber", () => {
  it("reads codes from names", () => {
    expect(extractFlightNumber("MH88")).toBe("MH88");
    expect(extractFlightNumber("MH88 KUL→HND")).toBe("MH88");
    expect(extractFlightNumber("D7532")).toBe("D7532");
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
  });
});

describe("lookupFlightByNumber", () => {
  it("fills KUL→KIX for AirAsia X D7532 from FR24-shaped JSON", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("flight/list.json")) {
        return new Response(
          JSON.stringify({
            result: {
              response: {
                data: [
                  {
                    identification: { number: { default: "D7532" } },
                    status: { text: "Scheduled" },
                    airport: {
                      origin: {
                        name: "Kuala Lumpur International Airport",
                        code: { iata: "KUL" },
                      },
                      destination: {
                        name: "Kansai International Airport",
                        code: { iata: "KIX" },
                      },
                    },
                    time: {
                      scheduled: { departure: 1794680100, arrival: 1794703500 },
                    },
                  },
                ],
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          results: [
            {
              id: "D7532",
              label: "D7532 / XAX532",
              detail: { operator: "AXM", flight: "D7532", callsign: "XAX532" },
              type: "schedule",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await lookupFlightByNumber("D7532", fetchImpl);
    expect(result).toMatchObject({
      number: "D7532",
      airline: "AirAsia X",
      fromIata: "KUL",
      toIata: "KIX",
      source: "flightradar24",
    });
    expect(result?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result?.time).toMatch(/^\d{2}:\d{2}$/);
    expect(suggestedFlightName(result!)).toBe("AirAsia X D7532");
    expect(result?.trackUrl).toContain("flightaware.com");
  });
});
