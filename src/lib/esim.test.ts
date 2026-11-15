import { afterEach, describe, expect, it } from "vitest";
import {
  ESIM_VERSION,
  createEsimPlan,
  deleteEsimPlan,
  esimExpiryStatus,
  invalidateEsimMemory,
  isEsimExpired,
  parseEsimJson,
  readCachedEsim,
  serializeEsim,
  upsertEsimPlan,
} from "@/lib/esim";

describe("parseEsimJson / serializeEsim", () => {
  it("returns [] for empty or invalid data", () => {
    expect(parseEsimJson(null)).toEqual([]);
    expect(parseEsimJson("")).toEqual([]);
    expect(parseEsimJson("not-json")).toEqual([]);
    expect(parseEsimJson("{}")).toEqual([]);
    expect(parseEsimJson('{"v":99,"plans":[]}')).toEqual([]);
    expect(parseEsimJson('{"v":1,"items":[]}')).toEqual([]);
  });

  it("round-trips plans and skips bad or duplicate rows", () => {
    const plan = createEsimPlan({
      name: "  Airalo Japan  ",
      dataAllowance: " 10GB ",
      expiryDate: "2026-11-20T09:00:00+09:00",
      notes: " ICCID 123 ",
      order: 0,
    });
    expect(plan.name).toBe("Airalo Japan");
    expect(plan.dataAllowance).toBe("10GB");
    expect(plan.expiryDate).toBe("2026-11-20");
    expect(plan.notes).toBe("ICCID 123");
    expect(plan.id.startsWith("esim-")).toBe(true);

    const raw = serializeEsim([plan]);
    const parsed = JSON.parse(raw) as { v: number; plans: unknown[] };
    expect(parsed.v).toBe(ESIM_VERSION);
    expect(parseEsimJson(raw)).toEqual([plan]);

    const messy = JSON.stringify({
      v: 1,
      plans: [
        { id: "b", name: "Second", dataAllowance: "5GB", order: 1 },
        { id: "bad" },
        { id: "a", name: "  First  ", expiryDate: "2026-11-18", order: 0 },
        { id: "a", name: "dup", order: 2 },
        { id: "empty", name: "   ", order: 3 },
      ],
    });
    const items = parseEsimJson(messy);
    expect(items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(items[0]).toMatchObject({
      name: "First",
      expiryDate: "2026-11-18",
      dataAllowance: "",
      notes: "",
    });
  });

  it("keeps an explicit empty list after the first visit", () => {
    expect(parseEsimJson(serializeEsim([]))).toEqual([]);
  });
});

describe("upsertEsimPlan / deleteEsimPlan", () => {
  it("adds, updates, and deletes a plan", () => {
    const first = createEsimPlan({ name: "Plan A", dataAllowance: "10GB" });
    const added = upsertEsimPlan([], first);
    expect(added).toHaveLength(1);
    const updated = upsertEsimPlan(added, {
      ...first,
      name: "Plan A+",
      dataAllowance: "20GB",
    });
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({
      id: first.id,
      name: "Plan A+",
      dataAllowance: "20GB",
    });
    expect(deleteEsimPlan(updated, first.id)).toEqual([]);
  });
});

describe("esimExpiryStatus", () => {
  const today = "2026-11-12";

  it("is expired when the date is before today", () => {
    expect(esimExpiryStatus("2026-11-11", today)).toBe("expired");
    expect(isEsimExpired("2026-11-11", today)).toBe(true);
  });

  it("is still valid on the expiry date and after-dates in the future", () => {
    expect(esimExpiryStatus("2026-11-12", today)).toBe("valid");
    expect(esimExpiryStatus("2026-11-20", today)).toBe("valid");
    expect(isEsimExpired("2026-11-12", today)).toBe(false);
    expect(isEsimExpired("2026-11-20T23:59:00+09:00", today)).toBe(false);
  });

  it("returns none when expiry is missing", () => {
    expect(esimExpiryStatus(null, today)).toBe("none");
    expect(esimExpiryStatus("", today)).toBe("none");
    expect(esimExpiryStatus("  ", today)).toBe("none");
    expect(isEsimExpired(null, today)).toBe(false);
  });
});

describe("readCachedEsim", () => {
  afterEach(() => {
    invalidateEsimMemory();
  });

  it("returns a stable reference for the same raw input", () => {
    const plan = createEsimPlan({ name: "Airalo", dataAllowance: "10GB" });
    const raw = serializeEsim([plan]);
    const first = readCachedEsim(() => raw);
    const second = readCachedEsim(() => raw);
    expect(second).toBe(first);
    expect(first[0]?.name).toBe("Airalo");
  });

  it("returns a stable empty list when the store is missing", () => {
    const first = readCachedEsim(() => null);
    const second = readCachedEsim(() => null);
    expect(first).toEqual([]);
    expect(second).toBe(first);
  });
});
