"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { CITY_COORDS } from "@/lib/types";
import { googleMapsHref } from "@/lib/maps";

export type DayMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "sight" | "food" | "other";
};

function numberIcon(n: number) {
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#b42318;color:#fff;font-size:12px;font-weight:600;box-shadow:0 1px 4px rgba(0,0,0,.28)">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function foodIcon() {
  return L.divIcon({
    className: "day-map-pin",
    html: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#ea580c" stroke="#fff" stroke-width="1.4" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9.2" r="2.4" fill="#fff"/></svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function otherIcon() {
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#b42318;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.28)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

function FitPins({
  positions,
  fallback,
}: {
  positions: [number, number][];
  fallback: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [36, 36], maxZoom: 15 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      map.setView(fallback, 12);
    }
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map, positions, fallback]);
  return null;
}

export default function DayMap({
  city,
  pins,
}: {
  city: string | null;
  pins: DayMapPin[];
}) {
  const fallback = (city && CITY_COORDS[city]) || CITY_COORDS.Kyoto;
  const path = pins.map((pin) => [pin.lat, pin.lng] as [number, number]);
  const sightPath = pins
    .filter((pin) => pin.kind === "sight")
    .map((pin) => [pin.lat, pin.lng] as [number, number]);
  let sightNumber = 0;
  const { id: styleId, pick, tiles } = useMapStyle();

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-stone-200 sm:h-64 md:h-72">
      <MapContainer
        center={fallback}
        zoom={12}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <FitPins positions={path} fallback={fallback} />
        <TileLayer
          key={styleId}
          attribution={tiles.attribution}
          url={tiles.url}
        />
        {sightPath.length > 1 ? (
          <Polyline
            positions={sightPath}
            pathOptions={{ color: "#b42318", weight: 3, opacity: 0.85 }}
          />
        ) : null}
        {pins.map((pin) => {
          const icon =
            pin.kind === "food"
              ? foodIcon()
              : pin.kind === "sight"
                ? numberIcon(++sightNumber)
                : otherIcon();
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={icon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-medium">{pin.name}</p>
                  <a
                    href={googleMapsHref({
                      name: pin.name,
                      lat: pin.lat,
                      lng: pin.lng,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#b42318] underline"
                  >
                    Google Maps
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <MapStyleSwitch id={styleId} onChange={pick} />
    </div>
  );
}
