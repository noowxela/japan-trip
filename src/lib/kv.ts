/** Shared Upstash Redis / Vercel KV REST helpers. */

export function kvEnv(): { url: string; token: string } | null {
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

export function isKvConfigured(): boolean {
  return kvEnv() != null;
}

export async function redisCommand(args: string[]): Promise<unknown> {
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
