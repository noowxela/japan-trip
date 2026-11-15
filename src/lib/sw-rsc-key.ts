/**
 * Stable Service Worker cache keys for Next.js RSC (flight) requests.
 *
 * Next appends `?_rsc=<hash>` where the hash covers the router state tree and
 * prefetch headers, so the same page fetched from a different screen gets a
 * different URL and the cache misses offline (SDD 015). We key on the path plus
 * the request kind and the point where the router tree diverges instead.
 */

export type RscRequestHeaders = {
  get(name: string): string | null;
};

export const RSC_KEY_PARAM = "__sw_rsc";

/**
 * Depth of the shallowest `"refetch"` marker in Next's router state tree
 * header (0 = root). Next 16 sends the *target* tree with that marker where
 * the server must start rendering, so a payload rendered at depth d also
 * works for any request at depth ≥ d. No / unreadable header → 0 (the server
 * renders from the root).
 */
export function refetchDepth(header: string | null): number {
  if (!header) return 0;
  let tree: unknown;
  try {
    tree = JSON.parse(decodeURIComponent(header));
  } catch {
    return 0;
  }
  let depth = 0;
  let node: unknown = tree;
  while (Array.isArray(node)) {
    if (node[3] === "refetch") return depth;
    const parallel = node[1] as { children?: unknown } | undefined;
    node = parallel?.children;
    depth += 1;
  }
  return 0;
}

/**
 * Kind of RSC request: full navigation payload, legacy prefetch, or a
 * per-segment prefetch. Payload shapes differ, so kinds never share a key.
 */
export function rscRequestKind(headers: RscRequestHeaders): string {
  const segment = headers.get("Next-Router-Segment-Prefetch");
  if (segment) return `seg:${segment}`;
  if (headers.get("Next-Router-Prefetch") === "1") return "prefetch";
  return "full";
}

/**
 * Normalised cache key URL for an RSC request: drops `_rsc` (a hash of the
 * router headers, so it changes with the screen you come from) and adds the
 * request kind plus refetch depth (`full|d1`).
 */
export function normalizeRscCacheKey(
  url: string,
  headers: RscRequestHeaders,
): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("_rsc");
  const depth = refetchDepth(headers.get("Next-Router-State-Tree"));
  parsed.searchParams.set(RSC_KEY_PARAM, `${rscRequestKind(headers)}|d${depth}`);
  return parsed.toString();
}

/**
 * Shallower keys to try when a full-navigation key misses offline: a payload
 * rendered from a shallower segment is a superset. Prefetch keys get none.
 */
export function shallowerRscKeys(key: string): string[] {
  const parsed = new URL(key);
  const value = parsed.searchParams.get(RSC_KEY_PARAM) ?? "";
  const match = /^full\|d(\d+)$/.exec(value);
  if (!match) return [];
  const keys: string[] = [];
  for (let d = Number(match[1]) - 1; d >= 0; d -= 1) {
    parsed.searchParams.set(RSC_KEY_PARAM, `full|d${d}`);
    keys.push(parsed.toString());
  }
  return keys;
}

/**
 * Exact cache key, then shallower full keys. Always start from the normalised
 * key — passing the raw `?_rsc=` request URL to `shallowerRscKeys` is a no-op
 * because that URL has no `__sw_rsc` param.
 */
export function rscCacheLookupKeys(
  url: string,
  headers: RscRequestHeaders,
): string[] {
  const key = normalizeRscCacheKey(url, headers);
  return [key, ...shallowerRscKeys(key)];
}

/**
 * Cache API rejects `cache.put()` for `Cache-Control: no-store` (Next's
 * force-dynamic RSC responses). Strip those directives on the *stored* copy
 * so offline reuse works; the response returned to the page keeps the original
 * headers. Also avoids a teed `cache.put(response.clone())` cancelling the
 * stream the router is still reading.
 */
export function rscCacheableHeaders(headers: Headers): Headers {
  const stored = new Headers(headers);
  stored.delete("cache-control");
  stored.delete("pragma");
  return stored;
}

/** Re-warm a page's full RSC payload at most this often (SDD 015). */
export const RSC_WARM_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * After an online document load, should the SW also fetch the page's full
 * RSC payload so a later offline soft tap can use it? Only when none is
 * cached or the cached one is older than `RSC_WARM_MAX_AGE_MS` — keeps the
 * extra server render (and Notion reads) rare.
 */
export function shouldWarmRsc(
  cachedDateHeader: string | null | undefined,
  nowMs: number,
): boolean {
  if (!cachedDateHeader) return true;
  const ms = Date.parse(cachedDateHeader);
  if (!Number.isFinite(ms)) return true;
  return nowMs - ms > RSC_WARM_MAX_AGE_MS;
}
