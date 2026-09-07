"use client";

import { useEffect, useState } from "react";
import {
  HIDDEN_MAP_PINS_CHANGED_EVENT,
  HIDDEN_MAP_PINS_STORAGE_KEY,
  readHiddenMapPinIds,
  toggleHiddenMapPin,
  visibleMapPins,
} from "@/lib/hidden-map-pins";

const emptySet = () => new Set<string>();

export function useHiddenMapPinIds() {
  const [ids, setIds] = useState<Set<string>>(emptySet);
  useEffect(() => {
    const sync = () => setIds(readHiddenMapPinIds());
    const onStorage = (event: StorageEvent) => {
      if (event.key === HIDDEN_MAP_PINS_STORAGE_KEY || event.key === null) {
        sync();
      }
    };
    sync();
    window.addEventListener(HIDDEN_MAP_PINS_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HIDDEN_MAP_PINS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return ids;
}

export function useVisibleMapPins<T extends { id: string }>(pins: T[]) {
  const hiddenIds = useHiddenMapPinIds();
  return visibleMapPins(pins, hiddenIds);
}

export function HideMapPinButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const hiddenIds = useHiddenMapPinIds();
  const hidden = hiddenIds.has(id);
  const label = hidden ? `Show ${name} on the map` : `Hide ${name} from the map`;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={hidden}
      title={hidden ? "Show on map" : "Hide from map"}
      draggable={false}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        toggleHiddenMapPin(id);
      }}
      className={`mt-0.5 inline-flex shrink-0 rounded-full p-1 ${
        hidden
          ? "text-stone-300 hover:bg-stone-100 hover:text-stone-500"
          : "text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
        />
        {hidden ? (
          <>
            <path
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeWidth={3.4}
              d="M5 19 19 5"
            />
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={2}
              d="M5 19 19 5"
            />
          </>
        ) : null}
      </svg>
    </button>
  );
}
