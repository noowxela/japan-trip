/** Ring buffer of Apple Pay / Shortcuts POST /api/spend attempts (KV, not Notion). */

import { isKvConfigured, redisCommand } from "@/lib/kv";

export type SpendIngestAttempt = {
  at: string;
  ok: boolean;
  status: number;
  error?: string;
  /** Amount parsed; null if missing/invalid. */
  amount: number | null;
  /** Expense name after merchant/name/card fallback. */
  name?: string;
  merchant?: string;
  card?: string;
  /** Truncated raw JSON body for diagnosis. */
  raw?: string;
  /** Keys present on the (merged) payload. */
  keys?: string[];
  /** Keys whose value was "" (common Shortcuts Currency Amount bug). */
  emptyKeys?: string[];
  /** typeof the amount field before parsing. */
  amountType?: string;
  /** True when Authorization header looked like Bearer … */
  authPresent: boolean;
  /** True when header matched SPEND_INGEST_SECRET. */
  authOk: boolean;
  expenseId?: string;
  duplicate?: boolean;
  /** True when an explicit ¥0 tap was logged as transit entry/detect (no Notion expense). */
  entryDetect?: boolean;
};

const KEY = "japan-trip:spend-ingest-log";
const MAX = 40;

export const INGEST_LOG_PAGE_SIZE = 10;

export type IngestLogPage<T> = {
  page: number;
  pageCount: number;
  slice: T[];
  from: number;
  to: number;
  total: number;
};

/** Newest-first page of ingest attempts. Page 1 is the latest records. */
export function paginateIngestLog<T>(
  rows: T[],
  page: number,
  pageSize = INGEST_LOG_PAGE_SIZE,
): IngestLogPage<T> {
  const total = rows.length;
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1), pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * size;
  const slice = rows.slice(start, start + size);
  return {
    page: safePage,
    pageCount,
    slice,
    from: total === 0 ? 0 : start + 1,
    to: start + slice.length,
    total,
  };
}

export function isSpendIngestLogWritable(): boolean {
  return isKvConfigured();
}

function parseLog(raw: unknown): SpendIngestAttempt[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (row): row is SpendIngestAttempt =>
        !!row &&
        typeof row === "object" &&
        typeof (row as SpendIngestAttempt).at === "string" &&
        typeof (row as SpendIngestAttempt).status === "number",
    );
  } catch {
    return [];
  }
}

/** Best-effort append; never throws to the caller (ingest must not fail on logging). */
export async function recordSpendIngestAttempt(
  entry: Omit<SpendIngestAttempt, "at"> & { at?: string },
): Promise<void> {
  if (!isKvConfigured()) {
    console.info("spend-ingest", entry);
    return;
  }
  try {
    const at = entry.at ?? new Date().toISOString();
    const row: SpendIngestAttempt = { ...entry, at };
    const current = parseLog(await redisCommand(["GET", KEY]));
    const next = [row, ...current].slice(0, MAX);
    await redisCommand(["SET", KEY, JSON.stringify(next)]);
  } catch (error) {
    console.error("spend-ingest-log write failed", error);
  }
}

export async function listSpendIngestAttempts(): Promise<SpendIngestAttempt[]> {
  if (!isKvConfigured()) return [];
  try {
    return parseLog(await redisCommand(["GET", KEY]));
  } catch (error) {
    console.error("spend-ingest-log read failed", error);
    return [];
  }
}
