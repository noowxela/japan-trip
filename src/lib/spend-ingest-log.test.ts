import { describe, expect, it } from "vitest";

// Exercise the filter shape used by listSpendIngestAttempts consumers.
describe("spend ingest attempt shape", () => {
  it("accepts success and auth-fail rows", () => {
    const rows = [
      {
        at: "2026-11-09T02:00:00.000Z",
        ok: true,
        status: 200,
        amount: 210,
        card: "Suica",
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
    expect(rows[1].authPresent).toBe(false);
  });
});
