"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, Polyline, ScaleControl, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useVisibleMapPins } from "@/components/hide-map-pin-button";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { MapTiles } from "@/components/map-tiles";
import {
  MAP_CORNER_BTN_SM,
  MapZoomButtons,
} from "@/components/map-zoom-buttons";
import {
  foodPinIcon,
  labelPinIcon,
  otherPinIcon,
  sightNumberIcon,
  stayPinIcon,
} from "@/lib/map-pin-icons";
import { sightNumbersById } from "@/lib/schedule-pins";
import { CITY_COORDS } from "@/lib/types";
import { googleMapsHref } from "@/lib/maps";
import { useT } from "@/components/i18n-provider";

export type DayMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "sight" | "food" | "other" | "stay";
  label?: string;
};

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

function MapLabelsButton({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      aria-label={hidden ? t("map.showNames") : t("map.hideNames")}
      aria-pressed={hidden}
      title={hidden ? t("map.showNames") : t("map.hideNames")}
      onClick={onToggle}
      className={`${MAP_CORNER_BTN_SM} ${hidden ? "text-ink-muted" : ""}`}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
  const { t } = useT();
  return (
    <button
      type="button"
      aria-label={active ? t("common.showSchedule") : t("map.fullscreen")}
      aria-pressed={active}
      title={active ? t("common.showSchedule") : t("map.fullscreen")}
      onClick={onToggle}
      className={`day-map-fullscreen-btn ${MAP_CORNER_BTN_SM}`}
    >
      {active ? (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M9 9 4 4M4 10V4h6M15 9l5-5M20 10V4h-6M9 15l-5 5M4 14v6h6M15 15l5 5M20 14v6h-6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
        </svg>
      )}
    </button>
  );
}

function DayMapCornerStack({
  styleId,
  onStyleChange,
  hideLabels,
  onToggleLabels,
  fullscreen,
  onToggleFullscreen,
}: {
  styleId: ReturnType<typeof useMapStyle>["id"];
  onStyleChange: (id: ReturnType<typeof useMapStyle>["id"]) => void;
  hideLabels: boolean;
  onToggleLabels: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-[1100]">
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <MapStyleSwitch
            id={styleId}
            onChange={onStyleChange}
            compact
            size="sm"
            className="relative"
          />
          <MapFullscreenButton active={fullscreen} onToggle={onToggleFullscreen} />
          <MapLabelsButton hidden={hideLabels} onToggle={onToggleLabels} />
        </div>
      </div>
      {/* Joined ± above scale (bottom-left); hidden on coarse pointers (pinch zoom). */}
      <div className="pointer-events-none absolute bottom-[2.75rem] left-2 z-[1100]">
        <MapZoomButtons variant="joined" className="pointer-events-auto" />
      </div>
    </>
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
    // Rebuild coords from keys so deps stay value-stable across parent re-renders
    // (e.g. pin labels appearing) and do not refit / zoom the user back out.
    const pts: [number, number][] = boundsKey
      ? boundsKey.split("|").map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          return [lat, lng];
        })
      : [];
    const [flat, flng] = fallbackKey.split(",").map(Number);
    const origin: [number, number] = [flat, flng];
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
  const { t } = useT();
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
          ? "day-map-fullscreen fixed inset-0 z-2000 overflow-hidden bg-surface"
          : `relative w-full overflow-hidden border-line ${className || "h-52 rounded-2xl border sm:h-64 md:h-72"}`.trim()) +
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
        <ScaleControl position="bottomleft" imperial={false} maxWidth={80} />
        <MapZoomGate minZoom={NAME_ZOOM} />
        <FitPins positions={path} fallback={fallback} />
        <MapTiles styleId={styleId} tiles={tiles} />
        {sightPath.length > 1 ? (
          <Polyline
            positions={sightPath}
            pathOptions={{ color: "var(--accent)", weight: 3, opacity: 0.85 }}
          />
        ) : null}
        {visiblePins.map((pin) => {
          const icon = pin.kind === "stay"
            ? stayPinIcon()
            : pin.label
            ? labelPinIcon(pin.label)
            : pin.kind === "food"
              ? foodPinIcon()
              : pin.kind === "sight"
                ? sightNumberIcon(sightNumbers.get(pin.id) ?? 0)
                : otherPinIcon();
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
                    <p className="text-xs font-semibold text-ink-muted">{pin.label}</p>
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
                    className="text-ink-muted no-underline"
                  >
                    {t("map.openTitle")}
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <DayMapCornerStack
          styleId={styleId}
          onStyleChange={pick}
          hideLabels={hideLabels}
          onToggleLabels={() => setHideLabels((value) => !value)}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </MapContainer>
    </div>
  );
}
