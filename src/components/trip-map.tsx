"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  ScaleControl,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChipRow } from "@/components/compact/chip-row";
import { DirectionsLink } from "@/components/directions-link";
import { useVisibleMapPins } from "@/components/hide-map-pin-button";
import { useT } from "@/components/i18n-provider";
import { MapStyleSwitch, useMapStyle } from "@/components/map-style-switch";
import { MapTiles } from "@/components/map-tiles";
import { MapZoomButtons } from "@/components/map-zoom-buttons";
import { MapsPinLink } from "@/components/maps-pin-link";
import { formatTime } from "@/lib/format";
import { labelType } from "@/lib/i18n/dictionaries";
import {
  ALL_CITIES_KEY,
  carouselPinsForCity,
  citiesInTripOrder,
  cityChipLabel,
  filterPinsByCity,
  normalizeCityKey,
} from "@/lib/map-carousel";
import {
  clusterByPixelDistance,
  formatDayGroupLabel,
  type DayCluster,
} from "@/lib/map-day-clusters";
import {
  dayBadgeIcon,
  dayDotIcon,
  dayGroupBadgeIcon,
  dayPinColor,
  stayPinIcon,
} from "@/lib/map-pin-icons";
import { CITY_COORDS } from "@/lib/types";

const DAY_BADGE_CLUSTER_PX = 28;
const CHIP_BAR_H = 44;
const CAROUSEL_H = 104;
const CITY_ZOOM = 13;
const CHROME_PAD = 16;

/** Shift fly/setView centre so the marker sits in the band between chips and carousel. */
function centerForVisibleBand(
  map: { getSize: () => { x: number; y: number }; project: (ll: [number, number], z: number) => { x: number; y: number }; unproject: (p: [number, number], z: number) => { lat: number; lng: number } },
  latlng: [number, number],
  zoom: number,
  padTop: number,
  padBottom: number,
): [number, number] {
  const size = map.getSize();
  const visibleMid = padTop + Math.max(0, size.y - padTop - padBottom) / 2;
  const offsetY = size.y / 2 - visibleMid;
  if (Math.abs(offsetY) < 1) return latlng;
  const point = map.project(latlng, zoom);
  const center = map.unproject([point.x, point.y + offsetY], zoom);
  return [center.lat, center.lng];
}
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
  start: string | null;
  type: string | null;
  city: string | null;
  mapsUrl: string | null;
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

type PlacedPin = TripMapPin & {
  displayLat: number;
  displayLng: number;
  dayIndex: number;
};

function pinBoundsKey(positions: [number, number][]) {
  return positions.map(([lat, lng]) => `${lat},${lng}`).join("|");
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
        const center = centerForVisibleBand(
          map,
          pts[0],
          CITY_ZOOM,
          pty,
          pby,
        );
        map.setView(center, CITY_ZOOM);
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

function FlyToCity({
  target,
  padTopLeft,
  padBottomRight,
  revision,
}: {
  target: [number, number][] | null;
  padTopLeft: [number, number];
  padBottomRight: [number, number];
  revision: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target || target.length === 0 || !revision) return;
    if (target.length === 1) {
      const center = centerForVisibleBand(
        map,
        target[0],
        CITY_ZOOM,
        padTopLeft[1],
        padBottomRight[1],
      );
      map.flyTo(center, CITY_ZOOM, { duration: 0.75 });
      return;
    }
    map.flyToBounds(target, {
      paddingTopLeft: padTopLeft,
      paddingBottomRight: padBottomRight,
      maxZoom: 14,
      duration: 0.75,
    });
  }, [map, target, padTopLeft, padBottomRight, revision]);
  return null;
}

function FlyToPin({
  target,
  enabled,
  padTop,
  padBottom,
}: {
  target: [number, number] | null;
  enabled: boolean;
  padTop: number;
  padBottom: number;
}) {
  const map = useMap();
  const lastKey = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !target) return;
    const key = `${target[0].toFixed(5)},${target[1].toFixed(5)}|${padTop}|${padBottom}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    const zoom = Math.max(map.getZoom(), CITY_ZOOM);
    const center = centerForVisibleBand(map, target, zoom, padTop, padBottom);
    map.flyTo(center, zoom, { duration: 0.55 });
  }, [map, target, enabled, padTop, padBottom]);
  useEffect(() => {
    if (!enabled) lastKey.current = null;
  }, [enabled]);
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
        <MapZoomButtons className="map-zoom-fine-only" />
      </div>
    </div>
  );
}

function ClusteredDayMarkers({
  pins,
  selectedPinId,
  onSelectPin,
  padTopLeft,
  padBottomRight,
}: {
  pins: PlacedPin[];
  selectedPinId: string | null;
  onSelectPin: (pinId: string) => void;
  padTopLeft: [number, number];
  padBottomRight: [number, number];
}) {
  const map = useMap();
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
          const selected = pin.id === selectedPinId;
          const icon = pin.dayId
            ? dayBadgeIcon(pin.dayIndex, pin.visited, selected)
            : dayDotIcon(pin.dayIndex, pin.visited, selected);
          const zIndexOffset = selected
            ? 1000
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
                click: () => onSelectPin(pin.id),
              }}
            />
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
                  const zoom = Math.min(map.getZoom() + 2, 14);
                  const center = centerForVisibleBand(
                    map,
                    bounds[0],
                    zoom,
                    padTopLeft[1],
                    padBottomRight[1],
                  );
                  map.flyTo(center, zoom, { duration: 0.55 });
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

function PlaceCarousel({
  items,
  selectedPinId,
  onSnapPin,
  programmaticPinId,
  onProgrammaticDone,
}: {
  items: PlacedPin[];
  selectedPinId: string | null;
  onSnapPin: (pinId: string) => void;
  programmaticPinId: string | null;
  onProgrammaticDone: () => void;
}) {
  const { t, locale } = useT();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const ignoreSnapUntil = useRef(0);
  const lastSnapped = useRef<string | null>(null);

  const setCardRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) cardRefs.current.set(id, node);
    else cardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (!programmaticPinId) return;
    const node = cardRefs.current.get(programmaticPinId);
    if (!node) return;
    ignoreSnapUntil.current = Date.now() + 600;
    lastSnapped.current = programmaticPinId;
    node.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
    const timer = window.setTimeout(onProgrammaticDone, 450);
    return () => window.clearTimeout(timer);
  }, [programmaticPinId, items, onProgrammaticDone]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreSnapUntil.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0];
        if (!top) return;
        const id = (top.target as HTMLElement).dataset.pinId;
        if (!id || id === lastSnapped.current) return;
        lastSnapped.current = id;
        onSnapPin(id);
      },
      { root, threshold: [0.55, 0.7, 0.85] },
    );

    for (const item of items) {
      const node = cardRefs.current.get(item.id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [items, onSnapPin]);

  if (items.length === 0) {
    return (
      <p className="px-4 py-3 text-center text-xs text-ink-muted">
        {t("map.carouselEmpty")}
      </p>
    );
  }

  return (
    <div
      ref={scrollerRef}
      role="list"
      aria-label={t("map.carousel")}
      className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto px-[10vw] pb-1 pt-1 lg:px-6"
    >
      {items.map((item) => {
        const active = item.id === selectedPinId;
        const time = formatTime(item.start) ?? "—";
        const typeLabel = labelType(locale, item.type) ?? item.type ?? "—";
        const cityLabel =
          item.city != null
            ? cityChipLabel(item.city, locale === "en" ? "en" : "zh")
            : null;
        const dayColor = dayPinColor(item.dayIndex);
        return (
          <article
            key={item.id}
            role="listitem"
            data-pin-id={item.id}
            ref={(node) => setCardRef(item.id, node)}
            className={`flex h-20 w-[80vw] shrink-0 snap-center items-center gap-1 rounded-xl border bg-surface/95 px-3 shadow-sm backdrop-blur lg:w-[320px] ${
              active
                ? "border-accent ring-1 ring-accent/40"
                : "border-line"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: dayColor }}
                >
                  D{item.dayIndex + 1}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                  {time}
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-ink">
                  {item.name}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {[typeLabel, cityLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center">
              <MapsPinLink
                name={item.name}
                lat={item.lat}
                lng={item.lng}
                mapsUrl={item.mapsUrl}
              />
              <DirectionsLink
                name={item.name}
                lat={item.lat}
                lng={item.lng}
                mapsUrl={item.mapsUrl}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function TripMap({ hops, hopPoints, pins, days }: Props) {
  const { t, locale } = useT();
  const [scrollWheelZoom, setScrollWheelZoom] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(max-width: 768px)").matches;
  });
  const [cityKey, setCityKey] = useState<string>(ALL_CITIES_KEY);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [fitRevision, setFitRevision] = useState("init");
  const [cityFlyRevision, setCityFlyRevision] = useState("");
  const [programmaticPinId, setProgrammaticPinId] = useState<string | null>(
    null,
  );
  /** When true, FlyToPin runs (carousel snap). Marker→carousel skips fly. */
  const [flyFromCarousel, setFlyFromCarousel] = useState(false);
  const syncSourceRef = useRef<"carousel" | "map" | "chip" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipBarRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [padTop, setPadTop] = useState(CHIP_BAR_H + CHROME_PAD);
  const [padBottom, setPadBottom] = useState(CAROUSEL_H + CHROME_PAD);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const onChange = () => setScrollWheelZoom(!mobile.matches);
    mobile.addEventListener("change", onChange);
    return () => mobile.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const chip = chipBarRef.current;
    const carousel = carouselRef.current;
    if (!root) return;

    function measure() {
      const rootEl = rootRef.current;
      if (!rootEl) return;
      const rootRect = rootEl.getBoundingClientRect();
      const chipEl = chipBarRef.current;
      const carEl = carouselRef.current;
      const nextTop = chipEl
        ? Math.round(chipEl.getBoundingClientRect().bottom - rootRect.top) +
          CHROME_PAD
        : CHIP_BAR_H + CHROME_PAD;
      const nextBottom = carEl
        ? Math.round(rootRect.bottom - carEl.getBoundingClientRect().top) +
          CHROME_PAD
        : CAROUSEL_H + CHROME_PAD;
      setPadTop((prev) => (prev === nextTop ? prev : nextTop));
      setPadBottom((prev) => (prev === nextBottom ? prev : nextBottom));
    }

    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measure())
        : null;
    ro?.observe(root);
    if (chip) ro?.observe(chip);
    if (carousel) ro?.observe(carousel);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

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

  const tripCities = useMemo(() => citiesInTripOrder(days), [days]);

  const chipOptions = useMemo(
    () => [
      { value: ALL_CITIES_KEY, label: t("map.allCities") },
      ...tripCities.map((city) => ({
        value: normalizeCityKey(city) ?? city,
        label: cityChipLabel(city, locale === "en" ? "en" : "zh"),
      })),
    ],
    [tripCities, t, locale],
  );

  const carouselItems = useMemo(
    () => carouselPinsForCity(placedPins, cityKey),
    [placedPins, cityKey],
  );

  const cityFilterPositions = useMemo(() => {
    const filtered = filterPinsByCity(placedPins, cityKey);
    return filtered.map(
      (pin) => [pin.displayLat, pin.displayLng] as [number, number],
    );
  }, [placedPins, cityKey]);

  const allPositions = useMemo(
    () =>
      placedPins.map(
        (pin) => [pin.displayLat, pin.displayLng] as [number, number],
      ),
    [placedPins],
  );

  const fitPositions =
    cityKey === ALL_CITIES_KEY ? allPositions : cityFilterPositions;

  const selectedPin = useMemo(
    () => placedPins.find((p) => p.id === selectedPinId) ?? null,
    [placedPins, selectedPinId],
  );

  const flyTarget = useMemo<[number, number] | null>(() => {
    if (!selectedPin || !flyFromCarousel) return null;
    return [selectedPin.displayLat, selectedPin.displayLng];
  }, [selectedPin, flyFromCarousel]);

  /** Measured chip-bar bottom + 16 / carousel height + 16 so pins clear chrome. */
  const padTopLeft = useMemo<[number, number]>(() => [20, padTop], [padTop]);
  const padBottomRight = useMemo<[number, number]>(
    () => [20, padBottom],
    [padBottom],
  );

  const onCityChange = (next: string) => {
    syncSourceRef.current = "chip";
    setCityKey(next);
    setFlyFromCarousel(false);
    setSelectedPinId(null);
    setCityFlyRevision(`city-${next}-${Date.now()}`);
    if (next === ALL_CITIES_KEY) {
      setFitRevision(`all-${Date.now()}`);
    }
  };

  const onSnapPin = useCallback((pinId: string) => {
    if (syncSourceRef.current === "map") return;
    syncSourceRef.current = "carousel";
    setFlyFromCarousel(true);
    setSelectedPinId(pinId);
  }, []);

  const onSelectPinFromMap = useCallback((pinId: string) => {
    syncSourceRef.current = "map";
    setFlyFromCarousel(false);
    setSelectedPinId(pinId);
    setProgrammaticPinId(pinId);
    // Ensure the card’s city is visible if filtered away.
    const pin = placedPins.find((p) => p.id === pinId);
    if (pin?.city && cityKey !== ALL_CITIES_KEY) {
      const key = normalizeCityKey(pin.city);
      if (key && key !== cityKey) {
        setCityKey(key);
      }
    }
  }, [placedPins, cityKey]);

  const onProgrammaticDone = useCallback(() => {
    setProgrammaticPinId(null);
    window.setTimeout(() => {
      if (syncSourceRef.current === "map") syncSourceRef.current = null;
    }, 50);
  }, []);

  const stayPins = useMemo(
    () => placedPins.filter((pin) => pin.kind === "stay"),
    [placedPins],
  );
  const dayPins = useMemo(() => {
    const list = placedPins.filter((pin) => pin.kind !== "stay");
    return list.sort((a, b) => {
      const aSel = a.id === selectedPinId ? 1 : 0;
      const bSel = b.id === selectedPinId ? 1 : 0;
      if (aSel !== bSel) return aSel - bSel;
      const aVis = a.visited ? 1 : 0;
      const bVis = b.visited ? 1 : 0;
      return aVis - bVis;
    });
  }, [placedPins, selectedPinId]);

  const cityFlyTarget =
    cityKey === ALL_CITIES_KEY
      ? allPositions
      : cityFilterPositions.length > 0
        ? cityFilterPositions
        : null;

  return (
    <div
      ref={rootRef}
      className="trip-map relative h-full w-full overflow-hidden bg-canvas"
      style={
        {
          "--trip-carousel-h": `${CAROUSEL_H}px`,
          "--trip-chip-h": `${CHIP_BAR_H}px`,
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
          positions={fitPositions}
          fallback={mapCenter}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
          revision={fitRevision}
        />
        <FlyToCity
          target={cityFlyTarget}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
          revision={cityFlyRevision}
        />
        <FlyToPin
          target={flyTarget}
          enabled={flyFromCarousel}
          padTop={padTop}
          padBottom={padBottom}
        />
        <MapTiles styleId={styleId} tiles={tiles} />
        {hopCoords.length > 1 ? (
          <Polyline
            positions={hopCoords}
            pathOptions={{ color: "var(--accent)", weight: 3, opacity: 0.7 }}
          />
        ) : null}
        {stayPins.map((pin) => {
          const selected = pin.id === selectedPinId;
          const zIndexOffset = selected ? 1000 : pin.visited ? 400 : 200;
          return (
            <Marker
              key={pin.id}
              position={[pin.displayLat, pin.displayLng]}
              icon={stayPinIcon(pin.visited, selected)}
              zIndexOffset={zIndexOffset}
              eventHandlers={{
                click: () => onSelectPinFromMap(pin.id),
              }}
            />
          );
        })}
        <ClusteredDayMarkers
          pins={dayPins}
          selectedPinId={selectedPinId}
          onSelectPin={onSelectPinFromMap}
          padTopLeft={padTopLeft}
          padBottomRight={padBottomRight}
        />
        <TripMapCornerStack styleId={styleId} onStyleChange={pick} />
      </MapContainer>

      <div
        ref={chipBarRef}
        className="pointer-events-none absolute inset-x-0 z-[1100] flex items-start gap-2 pl-2 pr-14"
        style={{
          top: "max(0.5rem, env(safe-area-inset-top, 0px))",
        }}
      >
        <div className="pointer-events-auto min-w-0 flex-1 rounded-full border border-line bg-surface/95 px-1.5 py-1 shadow-sm backdrop-blur">
          <ChipRow
            value={cityKey}
            options={chipOptions}
            onChange={onCityChange}
            label={t("map.cityFilter")}
          />
        </div>
      </div>

      <div
        ref={carouselRef}
        className="absolute inset-x-0 z-[1100] border-t border-line bg-surface/95 shadow-[0_-6px_20px_rgba(0,0,0,0.1)] backdrop-blur"
        style={{
          bottom: 0,
          paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {placedPins.length === 0 ? (
          <p className="px-4 py-3 text-center text-xs text-ink-muted">
            {t("map.carouselEmpty")}
          </p>
        ) : (
          <PlaceCarousel
            items={carouselItems}
            selectedPinId={selectedPinId}
            onSnapPin={onSnapPin}
            programmaticPinId={programmaticPinId}
            onProgrammaticDone={onProgrammaticDone}
          />
        )}
      </div>
    </div>
  );
}
