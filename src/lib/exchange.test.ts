import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyrToJpy, yenForMyr } from "@/lib/exchange";
import { JPY_PER_RM } from "@/lib/types";

describe("yenForMyr", () => {
  it("rounds MYR to Yen at the given rate", () => {
    expect(yenForMyr(10, 39.3)).toBe(393);
    expect(yenForMyr(1.5, 40)).toBe(60);
  });
});

describe("getMyrToJpy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses Frankfurter when the first fetch succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ date: "2026-10-26", rates: { JPY: 41.2 } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMyrToJpy()).resolves.toEqual({
      jpyPerRm: 41.2,
      asOf: "2026-10-26",
      live: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to Open ER when Frankfurter fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rates: { JPY: 40.5 },
          time_last_update_utc: "Sun, 26 Oct 2026 00:00:00 +0000",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMyrToJpy();
    expect(quote.live).toBe(true);
    expect(quote.jpyPerRm).toBe(40.5);
    expect(quote.asOf).toBe("2026-10-26");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the static fallback when every provider fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );

    await expect(getMyrToJpy()).resolves.toEqual({
      jpyPerRm: JPY_PER_RM,
      asOf: null,
      live: false,
    });
  });
});
