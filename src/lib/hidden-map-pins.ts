export const HIDDEN_MAP_PINS_STORAGE_KEY = "japan-trip-hidden-map-pins";
export const HIDDEN_MAP_PINS_CHANGED_EVENT = "japan-trip-hidden-map-pins-changed";

type StoreV1 = { v: 1; ids: string[] };

function empty(): Set<string> {
  return new Set();
}

export function readHiddenMapPinIds(): Set<string> {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(HIDDEN_MAP_PINS_STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as StoreV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.ids)) return empty();
    return new Set(parsed.ids.filter((id) => typeof id === "string"));
  } catch {
    return empty();
  }
}

function writeHiddenMapPinIds(ids: Set<string>) {
  localStorage.setItem(
    HIDDEN_MAP_PINS_STORAGE_KEY,
    JSON.stringify({ v: 1, ids: [...ids] } satisfies StoreV1),
  );
  window.dispatchEvent(new Event(HIDDEN_MAP_PINS_CHANGED_EVENT));
}

export function isMapPinHidden(id: string) {
  return readHiddenMapPinIds().has(id);
}

export function toggleHiddenMapPin(id: string) {
  const next = readHiddenMapPinIds();
  if (next.has(id)) next.delete(id);
  else next.add(id);
  writeHiddenMapPinIds(next);
  return next.has(id);
}

export function visibleMapPins<T extends { id: string }>(
  pins: T[],
  hiddenIds: Set<string>,
) {
  if (hiddenIds.size === 0) return pins;
  return pins.filter((pin) => !hiddenIds.has(pin.id));
}
