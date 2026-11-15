"use client";

import { AttributionControl } from "react-leaflet";

/**
 * Tile credit only (no Leaflet prefix). Fuller Leaflet/OSM/Esri copy lives in
 * Settings → About.
 */
export function MapAttribution({
  position = "bottomright",
}: {
  position?: "bottomleft" | "bottomright" | "topleft" | "topright";
}) {
  return <AttributionControl position={position} prefix={false} />;
}
