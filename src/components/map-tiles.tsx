"use client";

import { TileLayer } from "react-leaflet";
import type { MapStyleDef, MapStyleId } from "@/lib/map-styles";

export function MapTiles({
  styleId,
  tiles,
}: {
  styleId: MapStyleId;
  tiles: MapStyleDef;
}) {
  return (
    <>
      <TileLayer
        key={`${styleId}-base`}
        attribution={tiles.attribution}
        url={tiles.url}
        maxZoom={tiles.maxZoom ?? 19}
      />
      {tiles.overlayUrl ? (
        <TileLayer
          key={`${styleId}-overlay`}
          url={tiles.overlayUrl}
          maxZoom={tiles.maxZoom ?? 19}
          opacity={1}
          zIndex={250}
        />
      ) : null}
    </>
  );
}
