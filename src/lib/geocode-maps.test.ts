import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveGoogleMapsUrl, searchPlacesJapan } from "@/lib/geocode";

const SHORT = "https://maps.app.goo.gl/Cchv3jZLDspqvTpr7";
const FULL =
  "https://www.google.com/maps/place/Nishiki+Market/@35.0050302,135.7621481,17z/data=!3m1!4b1!4m6!3m5!1s0x6001089ccd8ccb4f:0xb69ea31001ec6c9c!8m2!3d35.0050258!4d135.764723";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveGoogleMapsUrl short links", () => {
  it("follows a short-link redirect and reads the pin coordinates", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://maps.app.goo.gl/")) {
        return new Response(null, {
          status: 302,
          headers: { location: FULL },
        });
      }
      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const hit = await resolveGoogleMapsUrl(
      "錦市場\nhttps://maps.app.goo.gl/Cchv3jZLDspqvTpr7?g_st=ic",
    );
    expect(hit).toMatchObject({
      lat: 35.0050258,
      lng: 135.764723,
      name: "Nishiki Market",
    });
    expect(hit?.mapsUrl).toContain("google.com/maps/place/Nishiki+Market");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("resolves a bare short link without https://", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, { status: 302, headers: { location: FULL } }),
      ),
    );
    const hit = await resolveGoogleMapsUrl("maps.app.goo.gl/Cchv3jZLDspqvTpr7");
    expect(hit).toMatchObject({ lat: 35.0050258, lng: 135.764723 });
  });
});

describe("searchPlacesJapan short links", () => {
  it("treats share text as a Maps link instead of a Nominatim query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("nominatim")) {
          throw new Error("should not geocode a short link as text");
        }
        if (url.startsWith("https://maps.app.goo.gl/")) {
          return new Response(null, { status: 302, headers: { location: FULL } });
        }
        return new Response("ok", { status: 200 });
      }),
    );
    const hits = await searchPlacesJapan(`Check out this place ${SHORT}`);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ lat: 35.0050258, lng: 135.764723 });
  });
});
