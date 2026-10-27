"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  ScaleControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CityKanji } from "@/components/city-kanji";
import { useVisibleMapPins } from "@/components/hide-map-pin-button";
import { useT } from "@/components/i18n-provider";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { MapTiles } from "@/components/map-tiles";
import { MapZoomButtons } from "@/components/map-zoom-buttons";
import { formatDay } from "@/lib/format";
import { labelCity } from "@/lib/i18n/dictionaries";
import {
  clusterByPixelDistance,
  formatDayGroupLabel,
  type DayCluster,
} from "@/lib/map-day-clusters";
import {
  dayBadgeIcon,
  dayDotIcon,
  dayGroupBadgeIcon,
  stayPinIcon,
} from "@/lib/map-pin-icons";
import { CITY_COORDS } from "@/lib/types";

const DAY_BADGE_CLUSTER_PX = 28;
const POPUP_MAX_WIDTH = 260;

export type TripMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayId: string | null;
  dayName: string | null;
  kind: "sight" | "food" | "other" | "stay";
  visited: boolean;
  sightNumber: number | null;
};

export type TripMapDay = {
  id: string;
  name: string;
  date: string | null;
  city: string | null;
  stopCount: number;
};

type Props = {
  hops: string[];
  hopPoints?: [number, number][];
  pins: TripMapPin[];
  days: TripMapDay[];
};

const SHEET_COLLAPSED = 120;
const SHEET_MID_RATIO = 0.45;
const SHEET_MAX_RATIO = 0.85;
const DESKTOP_PANEL_W = 360;
const DESKTOP_MQ = "(min-width: 1024px)";

function pinBoundsKey(positions: [number, number][]) {
  return positions.map(([lat, lng]) => `${lat},${lng}`).join("|");
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return desktop;
}

function FitPins({
  positions,
  fallback,
  padTopLeft,
  padBottomRight,
  revision,
}: {
  positions: [number, number][];
  fallback: [number, number];
  padTopLeft: [number, number];
  padBottomRight: [number, number];
  revision: string;
}) {
  const map = useMap();
  const boundsKey = pinBoundsKey(positions);
  const fallbackKey = `${fallback[0]},${fallback[1]}`;
  const padKey = `${padTopLeft.join(",")}|${padBottomRight.join(",")}`;
  useEffect(() => {
    const pts: [number, number][] = boundsKey
      ? boundsKey.split("|").map((pair) => {
          const [lat, lng] = pair.split(",").map(Number);
          return [lat, lng];
        })
      : [];
    const [flat, flng] = fallbackKey.split(",").map(Number);
    const origin: [number, number] = [flat, flng];
    const [topPart, bottomPart] = padKey.split("|");
    const [ptx, pty] = topPart.split(",").map(Number);
    const [pbx, pby] = bottomPart.split(",").map(Number);
    function fit() {
      if (pts.length > 1) {
        map.fitBounds(pts, {
          paddingTopLeft: [ptx, pty],
          paddingBottomRight: [pbx, pby],
          maxZoom: 14,
        });
      } else if (pts.length === 1) {
        map.setView(pts[0], 13);
      } else {
        map.setView(origin, 6);
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
  }, [map, boundsKey, fallbackKey, padKey, revision]);
  return null;
}

function FlyToDay({
  target,
  padTopLeft,
  padBottomRight,
}: {
  target: [number, number][] | null;
  padTopLeft: [number, number];
  padBottomRight: [number, number];
}) {
  const map = useMap();
  useEffect(() => {
    if (!target || target.length === 0) return;
    if (target.length === 1) {
      map.flyTo(target[0], 13, { duration: 0.75 });
      return;
    }
    map.flyToBounds(target, {
      paddingTopLeft: padTopLeft,
      paddingBottomRight: padBottomRight,
      maxZoom: 14,
      duration: 0.75,
    });
  }, [map, target, padTopLeft, padBottomRight]);
  return null;
}

function TripMapCornerStack({
  styleId,
  onStyleChange,
}: {
  styleId: ReturnType<typeof useMapStyle>["id"];
  onStyleChange: (id: ReturnType<typeof useMapStyle>["id"]) => void;
}) {
  return (
    <div className="pointer-events-none absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-[1100] flex flex-col items-end gap-2">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <MapStyleSwitch
          id={styleId}
          onChange={onStyleChange}
          compact
          className="relative"
        />
        <MapZoomButtons />
      </div>
    </div>
  );
}

function ClusteredDayMarkers({
  pins,
  selectedDayId,
  onSelectDay,
  padTopLeft,
  padBottomRight,
  popupMaxWidth,
}: {
  pins: PlacedPin[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string | null) => void;
  padTopLeft: [number, number];
  padBottomRight: [number, number];
  popupMaxWidth: number;
}) {
  const map = useMap();
  const { t } = useT();
  const [clusters, setClusters] = useState<DayCluster[]>([]);
  const pinById = useMemo(() => {
    const m = new Map<string, PlacedPin>();
    for (const pin of pins) m.set(pin.id, pin);
    return m;
  }, [pins]);

  const pinsKey = useMemo(
    () =>
      pins
        .map(
          (p) =>
            `${p.id}:${p.displayLat.toFixed(5)},${p.displayLng.toFixed(5)},${p.dayIndex}`,
        )
        .join("|"),
    [pins],
  );

  useEffect(() => {
    function recompute() {
      const points = pins.map((pin) => ({
        id: pin.id,
        lat: pin.displayLat,
        lng: pin.displayLng,
        dayIndex: pin.dayIndex,
      }));
      const pixels = points.map((p) => {
        const pt = map.latLngToContainerPoint([p.lat, p.lng]);
        return { x: pt.x, y: pt.y };
      });
      setClusters(clusterByPixelDistance(points, pixels, DAY_BADGE_CLUSTER_PX));
    }
    recompute();
    map.on("zoomend", recompute);
    map.on("moveend", recompute);
    return () => {
      map.off("zoomend", recompute);
      map.off("moveend", recompute);
    };
  }, [map, pins, pinsKey]);

  return (
    <>
      {clusters.map((cluster) => {
        const members = cluster.ids
          .map((id) => pinById.get(id))
          .filter((p): p is PlacedPin => Boolean(p));
        if (members.length === 0) return null;

        if (members.length === 1) {
          const pin = members[0];
          const selected = pin.dayId != null && pin.dayId === selectedDayId;
          const icon = pin.dayId
            ? dayBadgeIcon(pin.dayIndex, pin.visited, selected)
            : dayDotIcon(pin.dayIndex, pin.visited, selected);
          const zIndexOffset = selected
            ? 800
            : pin.visited
              ? 400
              : 200 + pin.dayIndex;
          return (
            <Marker
              key={pin.id}
              position={[pin.displayLat, pin.displayLng]}
              icon={icon}
              zIndexOffset={zIndexOffset}
              eventHandlers={{
                click: () => {
                  if (pin.dayId) onSelectDay(pin.dayId);
                },
              }}
            >
              <Popup
                autoPan
                keepInView
                maxWidth={popupMaxWidth}
                autoPanPaddingTopLeft={padTopLeft}
                autoPanPaddingBottomRight={padBottomRight}
              >
                <div className="max-w-[240px] text-sm">
                  <p className="font-medium">{pin.name}</p>
                  {pin.visited ? (
                    <p className="text-xs text-ok">
                      ✓ {t("places.filterVisited")}
                    </p>
                  ) : null}
                  {pin.dayId ? (
                    <Link
                      href={`/schedule?day=${encodeURIComponent(pin.dayId)}`}
                      className="inline-flex min-h-11 items-center text-ink-muted no-underline"
                    >
                      {pin.dayName ?? t("map.openDay")}
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        }

        const label = formatDayGroupLabel(cluster.dayIndices);
        const bounds = members.map(
          (p) => [p.displayLat, p.displayLng] as [number, number],
        );
        return (
          <Marker
            key={`cluster-${cluster.ids.slice().sort().join("-")}`}
            position={[cluster.lat, cluster.lng]}
            icon={dayGroupBadgeIcon(label)}
            zIndexOffset={900}
            eventHandlers={{
              click: () => {
                if (bounds.length === 1) {
                  map.flyTo(bounds[0], Math.min(map.getZoom() + 2, 14), {
                    duration: 0.55,
                  });
                  return;
                }
                map.flyToBounds(bounds, {
                  paddingTopLeft: padTopLeft,
                  paddingBottomRight: padBottomRight,
                  maxZoom: 14,
                  duration: 0.55,
                });
              },
            }}
          />
        );
      })}
    </>
  );
}

type PlacedPin = TripMapPin & {
  displayLat: number;
  displayLng: number;
  dayIndex: number;
};

function placePinsWithOffset(
  pins: TripMapPin[],
  dayIndexById: Map<string, number>,
): PlacedPin[] {
  const groups = new Map<string, TripMapPin[]>();
  for (const pin of pins) {
    const key = `${pin.lat.toFixed(4)},${pin.lng.toFixed(4)}`;
    const list = groups.get(key) ?? [];
    list.push(pin);
    groups.set(key, list);
  }

  const placed: PlacedPin[] = [];
  for (const group of groups.values()) {
    const n = group.length;
    group.forEach((pin, index) => {
      let displayLat = pin.lat;
      let displayLng = pin.lng;
      if (n > 1) {
        const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
        const radius = 0.00016 * Math.min(n, 5);
        displayLat = pin.lat + Math.sin(angle) * radius;
        displayLng = pin.lng + Math.cos(angle) * radius;
      }
      placed.push({
        ...pin,
        displayLat,
        displayLng,
        dayIndex: pin.dayId != null ? (dayIndexById.get(pin.dayId) ?? 0) : 0,
      });
    });
  }
  return placed;
}

export default function TripMap({ hops, hopPoints, pins, days }: Props) {
  const { t, locale } = useT();
  const desktop = useIsDesktop();
  const [scrollWheelZoom, setScrollWheelZoom] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(max-width: 768px)").matches;
  });
  const midSheet = useCallback(() => {
    if (typeof window === "undefined") return 240;
    return Math.round(window.innerHeight * SHEET_MID_RATIO);
  }, []);
  const maxSheet = useCallback(() => {
    if (typeof window === "undefined") return 360;
    return Math.round(window.innerHeight * SHEET_MAX_RATIO);
  }, []);
  const [sheetH, setSheetH] = useState(() =>
    typeof window === "undefined"
      ? 240
      : Math.round(window.innerHeight * SHEET_MID_RATIO),
  );
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [fitRevision, setFitRevision] = useState("init");
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const onChange = () => setScrollWheelZoom(!mobile.matches);
    mobile.addEventListener("change", onChange);
    const onResize = () => {
      setSheetH((current) => {
        const mid = midSheet();
        const max = maxSheet();
        if (current <= SHEET_COLLAPSED + 8) return SHEET_COLLAPSED;
        if (current >= max - 8) return max;
        return mid;
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      mobile.removeEventListener("change", onChange);
      window.removeEventListener("resize", onResize);
    };
  }, [midSheet, maxSheet]);

  const visiblePins = useVisibleMapPins(pins);
  const dayIndexById = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((day, index) => map.set(day.id, index));
    return map;
  }, [days]);

  const placedPins = useMemo(
    () => placePinsWithOffset(visiblePins, dayIndexById),
    [visiblePins, dayIndexById],
  );

  const hopCoords =
    hopPoints ??
    hops
      .map((city) => CITY_COORDS[city])
      .filter((coords): coords is [number, number] => Boolean(coords));
  const firstPin = visiblePins[0];
  const mapCenter: [number, number] =
    hopCoords[0] ??
    (firstPin ? [firstPin.lat, firstPin.lng] : [35.6812, 139.7671]);
  const { id: styleId, pick, tiles } = useMapStyle();

  const allPositions = useMemo(
    () =>
      placedPins.map(
        (pin) => [pin.displayLat, pin.displayLng] as [number, number],
      ),
    [placedPins],
  );

  const flyTarget = useMemo(() => {
    if (!selectedDayId) return null;
    const dayPins = placedPins.filter((pin) => pin.dayId === selectedDayId);
    return dayPins.map(
      (pin) => [pin.displayLat, pin.displayLng] as [number, number],
    );
  }, [selectedDayId, placedPins]);

  const cityGroups = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, TripMapDay[]>();
    for (const day of days) {
      const key = day.city?.trim() || t("map.unknownCity");
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(day);
    }
    return order.map((city) => ({ city, days: groups.get(city)! }));
  }, [days, t]);

  /** Top/left clear “全部标记” / Layers (~64px + safe) and left pill. */
  const padTopLeft = useMemo<[number, number]>(
    () => (desktop ? [DESKTOP_PANEL_W + 24, 72] : [120, 72]),
    [desktop],
  );
  const padBottomRight = useMemo<[number, number]>(
    () => (desktop ? [36, 36] : [24, sheetH + 28]),
    [desktop, sheetH],
  );
  const popupMaxWidth = POPUP_MAX_WIDTH;

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (desktop) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startH: sheetH };
  };

  const onHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (desktop || !dragRef.current) return;
    const delta = dragRef.current.startY - event.clientY;
    const next = Math.min(
      maxSheet(),
      Math.max(SHEET_COLLAPSED, dragRef.current.startH + delta),
    );
    setSheetH(next);
  };

  const onHandlePointerUp = () => {
    if (desktop || !dragRef.current) return;
    dragRef.current = null;
    setSheetH((current) => {
      const mid = midSheet();
      const max = maxSheet();
      let next = mid;
      if (current < (SHEET_COLLAPSED + mid) / 2) next = SHEET_COLLAPSED;
      else if (current > (mid + max) / 2) next = max;
      else next = mid;
      setFitRevision(`snap-${next}`);
      return next;
    });
  };

  const resetView = () => {
    setSelectedDayId(null);
    setFitRevision(`reset-${Date.now()}`);
  };

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;
  const sheetStyle = desktop
    ? {
        left: 0,
        top: 0,
        bottom: 0,
        width: DESKTOP_PANEL_W,
        height: "100%" as const,
        borderRadius: 0,
      }
    : {
        left: 0,
        right: 0,
        bottom: 0,
        height: sheetH,
      };

  const stayPins = useMemo(
    () => placedPins.filter((pin) => pin.kind === "stay"),
    [placedPins],
  );
  const dayPins = useMemo(() => {
    const list = placedPins.filter((pin) => pin.kind !== "stay");
    return list.sort((a, b) => {
      const aSel = a.dayId === selectedDayId ? 1 : 0;
      const bSel = b.dayId === selectedDayId ? 1 : 0;
      if (aSel !== bSel) return aSel - bSel;
      const aVis = a.visited ? 1 : 0;
      const bVis = b.visited ? 1 : 0;
      return aVis - bVis;
    });
  }, [placedPins, selectedDayId]);

  return (
    <div
      className="trip-map relative h-full w-full overflow-hidden bg-canvas"
      style={
        {
          "--trip-sheet-h": desktop ? "0px" : `${sheetH}px`,
          "--trip-panel-w": desktop ? `${DESKTOP_PANEL_W}px` : "0px",
        } as CSSProperties
      }
    >
      <MapContainer
        center={mapCenter}
        zoom={6}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={scrollWheelZoom}
        zoomControl={false}
      >
        <ScaleControl position="bottomleft" imperial={false} maxWidth={80} />
        <FitPins
          positions={allPositions}
          fallback={mapCenter}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
          revision={fitRevision}
        />
        <FlyToDay
          target={flyTarget}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
        />
        <MapTiles styleId={styleId} tiles={tiles} />
        {hopCoords.length > 1 ? (
          <Polyline
            positions={hopCoords}
            pathOptions={{ color: "var(--accent)", weight: 3, opacity: 0.7 }}
          />
        ) : null}
        {stayPins.map((pin) => {
          const selected = pin.dayId != null && pin.dayId === selectedDayId;
          const zIndexOffset = selected ? 800 : pin.visited ? 400 : 200;
          return (
            <Marker
              key={pin.id}
              position={[pin.displayLat, pin.displayLng]}
              icon={stayPinIcon(pin.visited)}
              zIndexOffset={zIndexOffset}
              eventHandlers={{
                click: () => {
                  if (pin.dayId) setSelectedDayId(pin.dayId);
                },
              }}
            >
              <Popup
                autoPan
                keepInView
                maxWidth={popupMaxWidth}
                autoPanPaddingTopLeft={padTopLeft}
                autoPanPaddingBottomRight={padBottomRight}
              >
                <div className="max-w-[240px] text-sm">
                  <p className="font-medium">{pin.name}</p>
                  {pin.visited ? (
                    <p className="text-xs text-ok">
                      ✓ {t("places.filterVisited")}
                    </p>
                  ) : null}
                  {pin.dayId ? (
                    <Link
                      href={`/schedule?day=${encodeURIComponent(pin.dayId)}`}
                      className="inline-flex min-h-11 items-center text-ink-muted no-underline"
                    >
                      {pin.dayName ?? t("map.openDay")}
                    </Link>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}
        <ClusteredDayMarkers
          pins={dayPins}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
          popupMaxWidth={popupMaxWidth}
        />
        <TripMapCornerStack styleId={styleId} onStyleChange={pick} />
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-[1000]">
        <button
          type="button"
          onClick={resetView}
          className="pointer-events-auto inline-flex min-h-11 items-center rounded-full border border-line bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm backdrop-blur"
        >
          {t("map.allPins")}
        </button>
      </div>

      <div
        className={`absolute z-[1100] flex flex-col border border-line bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.12)] transition-[height] duration-200 ease-out motion-reduce:transition-none ${
          desktop
            ? "rounded-none border-y-0 border-l-0 shadow-[4px_0_24px_rgba(0,0,0,0.08)]"
            : "inset-x-0 rounded-t-2xl"
        }`}
        style={sheetStyle}
      >
        {!desktop ? (
          <button
            type="button"
            aria-label={t("map.sheetHandle")}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            className="flex min-h-11 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <span className="block h-1 w-10 rounded-full bg-line" />
          </button>
        ) : (
          <div className="flex h-11 shrink-0 items-center px-4 text-sm font-semibold text-ink">
            {t("map.title")}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          {cityGroups.length === 0 ? (
            <p className="type-meta text-ink-muted">{t("map.empty")}</p>
          ) : (
            <ul className="space-y-4">
              {cityGroups.map((group) => (
                <li key={group.city}>
                  <p className="mb-1.5 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
                    <span>{labelCity(locale, group.city) ?? group.city}</span>
                    <CityKanji city={group.city} className="text-ink-muted" />
                  </p>
                  <ul className="space-y-1">
                    {group.days.map((day) => {
                      const active = day.id === selectedDayId;
                      const dateLabel = formatDay(day.date, locale);
                      return (
                        <li key={day.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDayId(day.id)}
                            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm ${
                              active
                                ? "bg-accent/10 text-accent"
                                : "text-ink hover:bg-canvas"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {day.name}
                              </span>
                              <span className="type-meta text-ink-muted">
                                {[
                                  dateLabel,
                                  t("map.stopCount", { n: day.stopCount }),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <span aria-hidden className="text-ink-muted">
                              →
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {selectedDay ? (
            <Link
              href={`/schedule?day=${encodeURIComponent(selectedDay.id)}`}
              className="notebook-btn mt-3 inline-flex min-h-11 w-full items-center justify-center bg-accent px-4 text-[15px] font-medium text-white no-underline"
            >
              {t("map.openSchedule")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
