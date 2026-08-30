"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map]);
  return null;
}

export function PlacePreviewMap({ lat, lng }: { lat: number; lng: number }) {
  const { id: styleId, pick, tiles } = useMapStyle();
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-xl border border-stone-200">
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat, lng]}
        zoom={16}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <InvalidateSize />
        <TileLayer
          key={styleId}
          attribution={tiles.attribution}
          url={tiles.url}
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
      <MapStyleSwitch id={styleId} onChange={pick} />
    </div>
  );
}
