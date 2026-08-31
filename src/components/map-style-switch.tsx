"use client";

import { useState } from "react";
import {
  MAP_STYLE_IDS,
  MAP_STYLES,
  readMapStyle,
  writeMapStyle,
  type MapStyleId,
} from "@/lib/map-styles";

export function useMapStyle() {
  const [id, setId] = useState<MapStyleId>(() => readMapStyle());

  function pick(next: MapStyleId) {
    setId(next);
    writeMapStyle(next);
  }

  return { id, pick, tiles: MAP_STYLES[id] };
}

export function MapStyleSwitch({
  id,
  onChange,
}: {
  id: MapStyleId;
  onChange: (id: MapStyleId) => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-[1000] flex max-w-[min(100%-0.75rem,22rem)] flex-wrap justify-end gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
      {MAP_STYLE_IDS.map((style) => {
        const active = style === id;
        return (
          <button
            key={style}
            type="button"
            onClick={() => onChange(style)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              active
                ? "bg-[#b42318] text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {MAP_STYLES[style].label}
          </button>
        );
      })}
    </div>
  );
}
