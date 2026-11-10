import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mapsGeocodeQueries,
  resolveGoogleMapsUrl,
  searchPlacesJapan,
} from "@/lib/geocode";

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


const ONIMARU_SHORT = "https://maps.app.goo.gl/Pm7cfe1ZVMuWEf756?g_st=ic";
const ONIMARU_REDIRECT =
  "https://maps.google.com?q=Onimaru+Kyoto+Shijo+Kawaramachi,+7+Otabimiyamotocho,+Shimogyo+Ward,+Kyoto,+600-8003,+Japan&ftid=0x600109fba6476f35:0xaa0154c2001a83f3&entry=gps";
const ONIMARU_HTML = `<html><title>Google Maps</title>
<a href="/maps/preview/place?pb=!1m14!1s0x600109fba6476f35:0xaa0154c2001a83f3!3m12!1m3!1d118140!2d114.1538816!3d22.28224">preview</a>
<meta name="center" content="22.29395825,114.2030336">
</html>`;

describe("mapsGeocodeQueries", () => {
  it("puts the street address ahead of the shop name alone", () => {
    const queries = mapsGeocodeQueries(
      "Onimaru Kyoto Shijo Kawaramachi, 7 Otabimiyamotocho, Shimogyo Ward, Kyoto, 600-8003, Japan",
    );
    expect(queries[0]).toContain("Onimaru Kyoto Shijo Kawaramachi");
    expect(queries).toContain(
      "7 Otabimiyamotocho, Shimogyo Ward, Kyoto, 600-8003",
    );
    expect(queries).toContain("7 Otabimiyamotocho, Shimogyo Ward, Kyoto");
    expect(queries.at(-1)).toBe("Onimaru Kyoto Shijo Kawaramachi");
  });
});

describe("resolveGoogleMapsUrl address-only short links", () => {
  it("geocodes the street address when the redirect has no pin", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://maps.app.goo.gl/")) {
        return new Response(null, {
          status: 302,
          headers: { location: ONIMARU_REDIRECT },
        });
      }
      if (url.startsWith("https://maps.google.com")) {
        return new Response(ONIMARU_HTML, {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      if (url.includes("nominatim.openstreetmap.org")) {
        const q = new URL(url).searchParams.get("q") ?? "";
        if (q.includes("7 Otabimiyamotocho")) {
          return Response.json([
            {
              lat: "35.0037760",
              lon: "135.7673020",
              name: "御旅宮本町",
              display_name: "御旅宮本町, 下京区, 京都市, 京都府, 日本",
            },
          ]);
        }
        return Response.json([]);
      }
      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const hit = await resolveGoogleMapsUrl(ONIMARU_SHORT);
    expect(hit).toMatchObject({
      name: "Onimaru Kyoto Shijo Kawaramachi",
      lat: 35.003776,
      lng: 135.767302,
    });
    expect(hit?.mapsUrl).toBe(ONIMARU_SHORT);
    // Do not treat Hong Kong viewport / center= in the shell HTML as the pin.
    expect(hit?.lat).not.toBeCloseTo(22.28, 1);
    expect(hit?.lng).not.toBeCloseTo(114.2, 1);
  });
});
