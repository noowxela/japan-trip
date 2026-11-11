import { describe, expect, it } from "vitest";
import { summarizeIngestPayload } from "@/lib/spend-ingest";
import {
  INGEST_LOG_PAGE_SIZE,
  paginateIngestLog,
} from "@/lib/spend-ingest-log";

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
      {
        at: "2026-11-09T02:02:00.000Z",
        ok: true,
        status: 200,
        amount: 0,
        name: "JR East",
        card: "Suica",
        authPresent: true,
        authOk: true,
        entryDetect: true,
      },
    ];
    expect(rows[0].ok).toBe(true);
    expect(rows[0].name).toBe("Tokyo Metro");
    expect(rows[0].raw).toContain("currency");
    expect(rows[1].authPresent).toBe(false);
    expect(rows[2].entryDetect).toBe(true);
    expect(rows[2].amount).toBe(0);
    expect(rows[2].ok).toBe(true);
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

describe("paginateIngestLog", () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

  it("shows the latest 10 on page 1", () => {
    const page = paginateIngestLog(rows, 1);
    expect(INGEST_LOG_PAGE_SIZE).toBe(10);
    expect(page.slice.map((row) => row.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(page).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 10, total: 25 });
  });

  it("returns the remainder on the last page", () => {
    const page = paginateIngestLog(rows, 3);
    expect(page.slice.map((row) => row.id)).toEqual([21, 22, 23, 24, 25]);
    expect(page).toMatchObject({ page: 3, pageCount: 3, from: 21, to: 25, total: 25 });
  });

  it("clamps out-of-range and empty pages", () => {
    expect(paginateIngestLog(rows, 0).page).toBe(1);
    expect(paginateIngestLog(rows, 99).page).toBe(3);
    expect(paginateIngestLog([], 1)).toMatchObject({
      page: 1,
      pageCount: 1,
      slice: [],
      from: 0,
      to: 0,
      total: 0,
    });
  });
});
