"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useVisibleMapPins } from "@/components/hide-map-pin-button";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { CITY_COORDS } from "@/lib/types";
import { googleMapsHref } from "@/lib/maps";

export type DayMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "sight" | "food" | "other" | "stay";
  label?: string;
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

function labelIcon(label: string) {
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:9999px;background:#b42318;color:#fff;font-size:11px;font-weight:700;letter-spacing:0.02em;box-shadow:0 1px 4px rgba(0,0,0,.28)">${label}</span>`,
    iconSize: [32, 28],
    iconAnchor: [16, 14],
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

function stayIcon() {
  return L.divIcon({
    className: "day-map-pin",
    html: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#047857" stroke="#fff" stroke-width="1.4" d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/></svg>`,
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

function MapFullscreenToggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const map = useMap();
  const onToggleRef = useRef(onToggle);

  useEffect(() => {
    onToggleRef.current = onToggle;
  });

  useEffect(() => {
    const control = new L.Control({ position: "bottomright" });
    control.onAdd = () => {
      const wrap = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      const btn = L.DomUtil.create("a", "day-map-fullscreen-btn") as HTMLAnchorElement;
      wrap.appendChild(btn);
      btn.href = "#";
      btn.setAttribute("role", "button");
      L.DomEvent.disableClickPropagation(wrap);
      L.DomEvent.disableScrollPropagation(wrap);
      L.DomEvent.on(btn, "click", (event) => {
        L.DomEvent.preventDefault(event);
        onToggleRef.current();
      });
      return wrap;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  useEffect(() => {
    const btn = map
      .getContainer()
      .querySelector(".day-map-fullscreen-btn");
    if (!(btn instanceof HTMLElement)) return;
    const label = active ? "Exit full screen" : "Full screen map";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.innerHTML = active
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 9 4 4M4 10V4h6M15 9l5-5M20 10V4h-6M9 15l-5 5M4 14v6h6M15 15l5 5M20 14v6h-6"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>`;
    const timer = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(timer);
  }, [map, active]);

  return null;
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
    function fit() {
      if (positions.length > 1) {
        map.fitBounds(positions, { padding: [36, 36], maxZoom: 15 });
      } else if (positions.length === 1) {
        map.setView(positions[0], 14);
      } else {
        map.setView(fallback, 12);
      }
      map.invalidateSize();
    }

    fit();
    const timer = window.setTimeout(fit, 80);
    const container = map.getContainer();
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => map.invalidateSize())
        : null;
    observer?.observe(container);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [map, positions, fallback]);
  return null;
}

export default function DayMap({
  city,
  pins,
  className = "",
}: {
  city: string | null;
  pins: DayMapPin[];
  className?: string;
}) {
  const fallback = (city && CITY_COORDS[city]) || CITY_COORDS.Kyoto;
  const visiblePins = useVisibleMapPins(pins);
  const path = visiblePins.map((pin) => [pin.lat, pin.lng] as [number, number]);
  const labeled = visiblePins.some((pin) => pin.label);
  const sightPath = labeled
    ? []
    : visiblePins
        .filter((pin) => pin.kind === "sight")
        .map((pin) => [pin.lat, pin.lng] as [number, number]);
  let sightNumber = 0;
  const { id: styleId, pick, tiles } = useMapStyle();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? "day-map-fullscreen fixed inset-0 z-2000 overflow-hidden bg-white"
          : `relative w-full overflow-hidden border-sage ${className || "h-52 rounded-2xl border sm:h-64 md:h-72"}`.trim()
      }
    >
      <MapContainer
        center={fallback}
        zoom={12}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <MapFullscreenToggle
          active={fullscreen}
          onToggle={() => setFullscreen((value) => !value)}
        />
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
        {visiblePins.map((pin) => {
          const icon = pin.kind === "stay"
            ? stayIcon()
            : pin.label
            ? labelIcon(pin.label)
            : pin.kind === "food"
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
                  {pin.label ? (
                    <p className="text-xs font-semibold text-hanko">{pin.label}</p>
                  ) : null}
                  <p className="font-medium">{pin.name}</p>
                  <a
                    href={googleMapsHref({
                      name: pin.name,
                      lat: pin.lat,
                      lng: pin.lng,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="text-hanko underline"
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
