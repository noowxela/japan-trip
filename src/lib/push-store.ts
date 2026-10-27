export type PushPrefs = {
  reminders: boolean;
  countdown: boolean;
};

export type PushSubscriptionJSON = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  /** Absent on legacy rows — treat as everything on via normalizePrefs. */
  prefs?: PushPrefs;
};

export type PrefKey = keyof PushPrefs;

const SUBS_KEY = "japan-trip:push-subscriptions";

const DEFAULT_PREFS: PushPrefs = { reminders: true, countdown: true };

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

/** True when Upstash/KV REST is configured (writable store). */
export function isPushStoreWritable(): boolean {
  return kvEnv() != null;
}

/** True when any subscription source exists (KV or env fallback). */
export function isPushStoreConfigured(): boolean {
  return isPushStoreWritable() || Boolean(process.env.PUSH_SUBSCRIPTIONS?.trim());
}

/** Missing / partial prefs → both channels on (backward compatible). */
export function normalizePrefs(value: unknown): PushPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PREFS };
  }
  const record = value as Record<string, unknown>;
  return {
    reminders:
      typeof record.reminders === "boolean"
        ? record.reminders
        : DEFAULT_PREFS.reminders,
    countdown:
      typeof record.countdown === "boolean"
        ? record.countdown
        : DEFAULT_PREFS.countdown,
  };
}

export function mergePrefs(
  current: PushPrefs | undefined,
  partial: Partial<PushPrefs>,
): PushPrefs {
  const base = normalizePrefs(current);
  return {
    reminders:
      typeof partial.reminders === "boolean" ? partial.reminders : base.reminders,
    countdown:
      typeof partial.countdown === "boolean" ? partial.countdown : base.countdown,
  };
}

/** Keep subscribers whose pref is not explicitly false (missing = on). */
export function filterByPref(
  subs: PushSubscriptionJSON[],
  key: PrefKey,
): PushSubscriptionJSON[] {
  return subs.filter((sub) => normalizePrefs(sub.prefs)[key] !== false);
}

export function parseSubscriptionsJson(
  raw: string | null | undefined,
): PushSubscriptionJSON[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("PUSH_SUBSCRIPTIONS is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("PUSH_SUBSCRIPTIONS must be a JSON array");
  }
  const out: PushSubscriptionJSON[] = [];
  for (const item of parsed) {
    const sub = normalizeSubscription(item);
    if (sub) out.push(sub);
  }
  return dedupeByEndpoint(out);
}

export function normalizeSubscription(
  value: unknown,
): PushSubscriptionJSON | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const endpoint = typeof record.endpoint === "string" ? record.endpoint.trim() : "";
  if (!endpoint.startsWith("https://")) return null;
  const keys = record.keys;
  if (!keys || typeof keys !== "object") return null;
  const keyRecord = keys as Record<string, unknown>;
  const p256dh = typeof keyRecord.p256dh === "string" ? keyRecord.p256dh.trim() : "";
  const auth = typeof keyRecord.auth === "string" ? keyRecord.auth.trim() : "";
  if (!p256dh || !auth) return null;
  const expirationTime =
    record.expirationTime === null || typeof record.expirationTime === "number"
      ? record.expirationTime
      : null;
  const prefs =
    "prefs" in record ? normalizePrefs(record.prefs) : undefined;
  const sub: PushSubscriptionJSON = {
    endpoint,
    expirationTime: expirationTime ?? null,
    keys: { p256dh, auth },
  };
  if (prefs) sub.prefs = prefs;
  return sub;
}

function dedupeByEndpoint(subs: PushSubscriptionJSON[]): PushSubscriptionJSON[] {
  const map = new Map<string, PushSubscriptionJSON>();
  for (const sub of subs) map.set(sub.endpoint, sub);
  return [...map.values()];
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

async function readFromKv(): Promise<PushSubscriptionJSON[]> {
  const result = await redisCommand(["GET", SUBS_KEY]);
  if (result == null) return [];
  if (typeof result !== "string") return [];
  return parseSubscriptionsJson(result);
}

async function writeToKv(subs: PushSubscriptionJSON[]): Promise<void> {
  await redisCommand(["SET", SUBS_KEY, JSON.stringify(subs)]);
}

function readFromEnv(): PushSubscriptionJSON[] {
  const raw = process.env.PUSH_SUBSCRIPTIONS;
  if (!raw?.trim()) return [];
  return parseSubscriptionsJson(raw);
}

export async function listSubscriptions(): Promise<PushSubscriptionJSON[]> {
  if (isPushStoreWritable()) {
    return readFromKv();
  }
  return readFromEnv();
}

export async function addSubscription(
  input: unknown,
): Promise<{ ok: true; subscription: PushSubscriptionJSON } | { ok: false; error: string; status: number }> {
  const sub = normalizeSubscription(input);
  if (!sub) {
    return { ok: false, error: "Invalid push subscription payload", status: 400 };
  }
  if (!isPushStoreWritable()) {
    return {
      ok: false,
      error:
        "Push subscription storage is not writable. Add Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN), or paste this subscription into the PUSH_SUBSCRIPTIONS env JSON array.",
      status: 503,
    };
  }
  const current = await readFromKv();
  const existing = current.find((s) => s.endpoint === sub.endpoint);
  // Re-subscribe keeps existing prefs; new payload prefs only apply when no prior row.
  const merged: PushSubscriptionJSON = {
    ...sub,
    prefs: existing?.prefs
      ? normalizePrefs(existing.prefs)
      : sub.prefs
        ? normalizePrefs(sub.prefs)
        : undefined,
  };
  const next = dedupeByEndpoint([
    ...current.filter((s) => s.endpoint !== merged.endpoint),
    merged,
  ]);
  await writeToKv(next);
  return { ok: true, subscription: merged };
}

export async function removeSubscription(
  endpoint: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const trimmed = endpoint?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Missing endpoint", status: 400 };
  }
  if (!isPushStoreWritable()) {
    return {
      ok: false,
      error:
        "Cannot remove from read-only PUSH_SUBSCRIPTIONS env. Delete the endpoint from that Vercel env var, or configure Upstash Redis.",
      status: 503,
    };
  }
  const current = await readFromKv();
  const next = current.filter((s) => s.endpoint !== trimmed);
  await writeToKv(next);
  return { ok: true };
}

/** Drop stale endpoints after web-push 404/410. No-op for env fallback. */
export async function removeSubscriptionsByEndpoints(
  endpoints: string[],
): Promise<number> {
  if (!endpoints.length || !isPushStoreWritable()) return 0;
  const drop = new Set(endpoints);
  const current = await readFromKv();
  const next = current.filter((s) => !drop.has(s.endpoint));
  const removed = current.length - next.length;
  if (removed > 0) await writeToKv(next);
  return removed;
}

export async function getPrefs(
  endpoint: string,
): Promise<
  | { ok: true; prefs: PushPrefs }
  | { ok: false; error: string; status: number }
> {
  const trimmed = endpoint?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Missing endpoint", status: 400 };
  }
  const subs = await listSubscriptions();
  const match = subs.find((s) => s.endpoint === trimmed);
  if (!match) {
    return { ok: false, error: "Unknown endpoint", status: 404 };
  }
  return { ok: true, prefs: normalizePrefs(match.prefs) };
}

export async function updatePrefs(
  endpoint: string,
  partialPrefs: Partial<PushPrefs>,
): Promise<
  | { ok: true; prefs: PushPrefs }
  | { ok: false; error: string; status: number }
> {
  const trimmed = endpoint?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, error: "Missing endpoint", status: 400 };
  }
  if (!isPushStoreWritable()) {
    return {
      ok: false,
      error:
        "Cannot update prefs on read-only PUSH_SUBSCRIPTIONS env. Configure Upstash Redis to change prefs.",
      status: 503,
    };
  }
  const current = await readFromKv();
  const index = current.findIndex((s) => s.endpoint === trimmed);
  if (index < 0) {
    return { ok: false, error: "Unknown endpoint", status: 404 };
  }
  const existing = current[index]!;
  const prefs = mergePrefs(existing.prefs, partialPrefs);
  const next = [...current];
  next[index] = { ...existing, prefs };
  await writeToKv(next);
  return { ok: true, prefs };
}
