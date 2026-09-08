"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, Polyline, ScaleControl, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useVisibleMapPins } from "@/components/hide-map-pin-button";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { sightNumbersById } from "@/lib/schedule-pins";
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
    tooltipAnchor: [0, -17],
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

const NAME_ZOOM = 14;

function MapZoomGate({ minZoom }: { minZoom: number }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    function update() {
      el.classList.toggle("day-map-named", map.getZoom() >= minZoom);
    }
    update();
    map.on("zoom zoomend", update);
    return () => {
      map.off("zoom zoomend", update);
      el.classList.remove("day-map-named");
    };
  }, [map, minZoom]);
  return null;
}

const MAP_CORNER_BTN =
  "flex h-8 w-8 items-center justify-center rounded-sm border border-black/20 bg-white text-stone-700 shadow-sm";

function MapLabelsButton({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={hidden ? "Show pin names" : "Hide pin names"}
      aria-pressed={hidden}
      title={hidden ? "Show pin names" : "Hide pin names"}
      onClick={onToggle}
      className={`${MAP_CORNER_BTN} ${hidden ? "text-stone-400" : ""}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="8" width="14" height="8" rx="4" />
        <path d="M17 12h4" />
        {hidden ? <path d="M4 20 20 4" /> : null}
      </svg>
    </button>
  );
}

function MapFullscreenButton({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={active ? "Show schedule" : "Full screen map"}
      aria-pressed={active}
      title={active ? "Show schedule" : "Full screen map"}
      onClick={onToggle}
      className={`day-map-fullscreen-btn ${MAP_CORNER_BTN}`}
    >
      {active ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M9 9 4 4M4 10V4h6M15 9l5-5M20 10V4h-6M9 15l-5 5M4 14v6h6M15 15l5 5M20 14v6h-6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
        </svg>
      )}
    </button>
  );
}

function pinBoundsKey(positions: [number, number][]) {
  return positions.map(([lat, lng]) => `${lat},${lng}`).join("|");
}

function FitPins({
  positions,
  fallback,
}: {
  positions: [number, number][];
  fallback: [number, number];
}) {
  const map = useMap();
  const boundsKey = pinBoundsKey(positions);
  const fallbackKey = `${fallback[0]},${fallback[1]}`;
  useEffect(() => {
    const pts = positions;
    const origin = fallback;
    function fit() {
      if (pts.length > 1) {
        map.fitBounds(pts, { padding: [36, 36], maxZoom: 15 });
      } else if (pts.length === 1) {
        map.setView(pts[0], 14);
      } else {
        map.setView(origin, 12);
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
    // boundsKey / fallbackKey encode the coordinates so a parent re-render
    // (e.g. pin labels appearing) does not refit and zoom the user back out.
  }, [map, boundsKey, fallbackKey]);
  return null;
}

export default function DayMap({
  city,
  pins,
  className = "",
  fullscreen: fullscreenProp,
  onFullscreenChange,
}: {
  city: string | null;
  pins: DayMapPin[];
  className?: string;
  fullscreen?: boolean;
  onFullscreenChange?: (value: boolean) => void;
}) {
  const fallback = (city && CITY_COORDS[city]) || CITY_COORDS.Kyoto;
  const visiblePins = useVisibleMapPins(pins);
  const sightNumbers = useMemo(() => sightNumbersById(pins), [pins]);
  const path = visiblePins.map((pin) => [pin.lat, pin.lng] as [number, number]);
  const labeled = visiblePins.some((pin) => pin.label);
  const sightPath = labeled
    ? []
    : visiblePins
        .filter((pin) => pin.kind === "sight")
        .map((pin) => [pin.lat, pin.lng] as [number, number]);
  const { id: styleId, pick, tiles } = useMapStyle();
  const [hideLabels, setHideLabels] = useState(false);
  const [internalFullscreen, setInternalFullscreen] = useState(false);
  const controlled = onFullscreenChange != null;
  const fullscreen = controlled ? Boolean(fullscreenProp) : internalFullscreen;
  const overlay = !controlled && fullscreen;

  function toggleFullscreen() {
    const next = !fullscreen;
    if (controlled) onFullscreenChange(next);
    else setInternalFullscreen(next);
  }

  useEffect(() => {
    if (!overlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setInternalFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [overlay]);

  return (
    <div
      className={
        (overlay
          ? "day-map-fullscreen fixed inset-0 z-2000 overflow-hidden bg-white"
          : `relative w-full overflow-hidden border-sage ${className || "h-52 rounded-2xl border sm:h-64 md:h-72"}`.trim()) +
        (hideLabels ? " day-map-labels-off" : "")
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
        <ScaleControl position="bottomright" imperial={false} maxWidth={80} />
        <ZoomControl position="bottomright" />
        <MapZoomGate minZoom={NAME_ZOOM} />
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
                ? numberIcon(sightNumbers.get(pin.id) ?? 0)
                : otherIcon();
          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={icon}
            >
              <Tooltip
                permanent
                interactive={false}
                direction="right"
                offset={pin.kind === "food" ? [14, 0] : [12, 0]}
                opacity={1}
                className="day-map-pin-name"
              >
                {pin.name}
              </Tooltip>
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
      <div className="absolute right-2.5 bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] z-1100 flex flex-col gap-1.5">
        <MapLabelsButton hidden={hideLabels} onToggle={() => setHideLabels((value) => !value)} />
        <MapFullscreenButton active={fullscreen} onToggle={toggleFullscreen} />
      </div>
    </div>
  );
}
