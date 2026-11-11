import { describe, expect, it } from "vitest";
import type { Stay } from "@/lib/types";
import {
  activeOverviewStays,
  checkedOutOverviewStays,
  isStayMarkedCheckedOut,
  markStayCheckedOut,
  parseCheckedOutStaysJson,
  serializeCheckedOutStays,
  unmarkStayCheckedOut,
} from "@/lib/checked-out-stays";

const mitsui: Stay = {
  id: "mitsui-kyoto",
  name: "Mitsui Garden Hotel Kyoto Shijo",
  checkIn: "2026-11-09",
  checkOut: "2026-11-12",
  address: "Kyoto",
  bookingUrl: null,
  confirmation: "",
  mapsUrl: null,
  lat: null,
  lng: null,
};

describe("parseCheckedOutStaysJson / serialize", () => {
  it("returns [] for empty or invalid", () => {
    expect(parseCheckedOutStaysJson(null)).toEqual([]);
    expect(parseCheckedOutStaysJson("")).toEqual([]);
    expect(parseCheckedOutStaysJson("not-json")).toEqual([]);
    expect(parseCheckedOutStaysJson("{}")).toEqual([]);
    expect(parseCheckedOutStaysJson('{"v":99,"items":[]}')).toEqual([]);
  });

  it("round-trips and skips duplicates", () => {
    const items = markStayCheckedOut([], mitsui.id, mitsui.checkOut);
    const raw = serializeCheckedOutStays(items);
    expect(parseCheckedOutStaysJson(raw)).toEqual(items);
    const messy = JSON.stringify({
      v: 1,
      items: [
        { stayId: "mitsui-kyoto", checkOutDate: "2026-11-12" },
        { stayId: "bad" },
        { stayId: "mitsui-kyoto", checkOutDate: "2026-11-12T11:00:00+09:00" },
      ],
    });
    expect(parseCheckedOutStaysJson(messy)).toEqual([
      { stayId: "mitsui-kyoto", checkOutDate: "2026-11-12" },
    ]);
  });
});

describe("markStayCheckedOut", () => {
  it("is idempotent for the same stay and check-out date", () => {
    const once = markStayCheckedOut([], "mitsui-kyoto", "2026-11-12");
    const twice = markStayCheckedOut(once, "mitsui-kyoto", "2026-11-12");
    expect(once).toEqual([{ stayId: "mitsui-kyoto", checkOutDate: "2026-11-12" }]);
    expect(twice).toEqual(once);
    expect(isStayMarkedCheckedOut(twice, "mitsui-kyoto", "2026-11-12")).toBe(
      true,
    );
  });
});

describe("activeOverviewStays", () => {
  it("shows the stay on check-out day until it is marked checked out", () => {
    expect(activeOverviewStays([mitsui], "2026-11-12", []).map((s) => s.id)).toEqual(
      ["mitsui-kyoto"],
    );
    const marked = markStayCheckedOut([], mitsui.id, mitsui.checkOut);
    expect(activeOverviewStays([mitsui], "2026-11-12", marked)).toEqual([]);
    expect(
      checkedOutOverviewStays([mitsui], "2026-11-12", marked).map((s) => s.id),
    ).toEqual(["mitsui-kyoto"]);
  });

  it("still excludes the day after check-out, even if unmarked", () => {
    expect(activeOverviewStays([mitsui], "2026-11-13", [])).toEqual([]);
    const marked = markStayCheckedOut([], mitsui.id, mitsui.checkOut);
    expect(activeOverviewStays([mitsui], "2026-11-13", marked)).toEqual([]);
  });

  it("undo restores the stay on check-out day", () => {
    const marked = markStayCheckedOut([], mitsui.id, mitsui.checkOut);
    const undone = unmarkStayCheckedOut(marked, mitsui.id, mitsui.checkOut);
    expect(activeOverviewStays([mitsui], "2026-11-12", undone).map((s) => s.id)).toEqual(
      ["mitsui-kyoto"],
    );
  });
});
