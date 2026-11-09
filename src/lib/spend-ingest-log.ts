/** Ring buffer of Apple Pay / Shortcuts POST /api/spend attempts (KV, not Notion). */

export type SpendIngestAttempt = {
  at: string;
  ok: boolean;
  status: number;
  error?: string;
  /** Amount parsed; null if missing/invalid. */
  amount: number | null;
  merchant?: string;
  card?: string;
  /** True when Authorization header looked like Bearer … */
  authPresent: boolean;
  /** True when header matched SPEND_INGEST_SECRET. */
  authOk: boolean;
  expenseId?: string;
  duplicate?: boolean;
};

const KEY = "japan-trip:spend-ingest-log";
const MAX = 40;

function kvEnv(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    "";
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

export function isSpendIngestLogWritable(): boolean {
  return kvEnv() != null;
}

async function redisCommand(args: string[]): Promise<unknown> {
  const kv = kvEnv();
  if (!kv) throw new Error("KV not configured");
  const res = await fetch(kv.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kv.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { result?: unknown };
  return data.result;
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
  if (!kvEnv()) {
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
  if (!kvEnv()) return [];
  try {
    return parseLog(await redisCommand(["GET", KEY]));
  } catch (error) {
    console.error("spend-ingest-log read failed", error);
    return [];
  }
}
