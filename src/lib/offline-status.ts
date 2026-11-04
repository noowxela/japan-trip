/** Message the SW posts when a NetworkFirst route answered from cache. */
export const SERVED_FROM_CACHE_MESSAGE = "kc:served-from-cache";

export type ServedFromCacheMessage = {
  type: typeof SERVED_FROM_CACHE_MESSAGE;
  url: string;
  cachedAt: string | null;
};

export function isServedFromCacheMessage(
  data: unknown,
): data is ServedFromCacheMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === SERVED_FROM_CACHE_MESSAGE &&
    typeof (data as { url?: unknown }).url === "string"
  );
}

/**
 * Timestamp to show as "data from X": the cached response's Date header
 * when known and valid, else the trip snapshot's savedAt, else null.
 */
export function staleSinceIso(
  cachedAt: string | null | undefined,
  snapshotSavedAt: string | null | undefined,
): string | null {
  if (cachedAt) {
    const ms = Date.parse(cachedAt);
    if (Number.isFinite(ms)) return new Date(ms).toISOString();
  }
  if (snapshotSavedAt && Number.isFinite(Date.parse(snapshotSavedAt))) {
    return snapshotSavedAt;
  }
  return null;
}
