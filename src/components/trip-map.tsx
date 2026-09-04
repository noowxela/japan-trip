"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { CITY_COORDS } from "@/lib/types";

type Pin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayId: string | null;
  dayName: string | null;
};

type Props = {
  hops: string[];
  hopPoints?: [number, number][];
  pins: Pin[];
};

export default function TripMap({ hops, hopPoints, pins }: Props) {
  const [scrollWheelZoom, setScrollWheelZoom] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const onChange = () => setScrollWheelZoom(!mobile.matches);
    mobile.addEventListener("change", onChange);
    return () => mobile.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  const hopCoords =
    hopPoints ??
    hops
      .map((city) => CITY_COORDS[city])
      .filter((coords): coords is [number, number] => Boolean(coords));
  const firstPin = pins[0];
  const mapCenter: [number, number] =
    hopCoords[0] ??
    (firstPin ? [firstPin.lat, firstPin.lng] : [35.6812, 139.7671]);
  const { id: styleId, pick, tiles } = useMapStyle();

  return (
    <div className="relative h-[22rem] w-full overflow-hidden rounded-2xl sm:h-[28rem] md:h-[36rem]">
      <MapContainer
        center={mapCenter}
        zoom={6}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={scrollWheelZoom}
      >
      <TileLayer
        key={styleId}
        attribution={tiles.attribution}
        url={tiles.url}
      />
      {hopCoords.length > 1 ? (
        <Polyline positions={hopCoords} pathOptions={{ color: "#b42318" }} />
      ) : null}
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.lat, pin.lng]}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{pin.name}</p>
              {pin.dayId ? (
                <Link href={`/days/${pin.dayId}`} className="text-hanko underline">
                  {pin.dayName ?? "Open day"}
                </Link>
              ) : null}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
      <MapStyleSwitch id={styleId} onChange={pick} />
    </div>
  );
}
