import { describe, expect, it } from "vitest";
import { summarizeIngestPayload } from "@/lib/spend-ingest";

// Exercise the filter shape used by listSpendIngestAttempts consumers.
describe("spend ingest attempt shape", () => {
  it("accepts success and auth-fail rows with name + raw", () => {
    const rows = [
      {
        at: "2026-11-09T02:00:00.000Z",
        ok: true,
        status: 200,
        amount: 210,
        name: "Tokyo Metro",
        card: "Suica",
        raw: '{"amount":{"amount":210,"currency":"JPY"},"merchant":"Tokyo Metro","card":"Suica"}',
        authPresent: true,
        authOk: true,
        expenseId: "abc",
      },
      {
        at: "2026-11-09T02:01:00.000Z",
        ok: false,
        status: 401,
        amount: null,
        authPresent: false,
        authOk: false,
        error: "Unauthorized (missing Authorization Bearer header)",
      },
    ];
    expect(rows[0].ok).toBe(true);
    expect(rows[0].name).toBe("Tokyo Metro");
    expect(rows[0].raw).toContain("currency");
    expect(rows[1].authPresent).toBe(false);
  });
});

describe("summarizeIngestPayload", () => {
  it("truncates long JSON", () => {
    const big = { note: "x".repeat(2000), amount: 1 };
    const raw = summarizeIngestPayload(big, 100);
    expect(raw.endsWith("…")).toBe(true);
    expect(raw.length).toBeLessThanOrEqual(101);
  });
});
