"use client";

import { useEffect, useRef, useState } from "react";
import { Polyline, useMap } from "react-leaflet";
import { useT } from "@/components/i18n-provider";
import { MAP_CORNER_BTN_SM } from "@/components/map-zoom-buttons";
import type { UserLocationFix } from "@/lib/user-location";
import {
  fetchWalkingRoute,
  formatWalkEta,
  shouldRefetchForOriginMove,
  type WalkingRouteResult,
} from "@/lib/walking-route";

const NAV_BLUE = "#1a73e8";

export type WalkingNavDest = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

function FitWalkingRoute({
  positions,
  destId,
}: {
  positions: [number, number][];
  destId: string;
}) {
  const map = useMap();
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (positions.length < 2) return;
    if (fittedFor.current === destId) return;
    fittedFor.current = destId;
    map.fitBounds(positions, { padding: [40, 40], maxZoom: 16 });
  }, [map, positions, destId]);
  return null;
}

/** Shared fetch: me → selected stop, with straight fallback + origin throttle. */
export function useWalkingNavRoute(
  origin: UserLocationFix | null,
  dest: WalkingNavDest | null,
): WalkingRouteResult | null {
  const [route, setRoute] = useState<WalkingRouteResult | null>(null);
  const [routeDestKey, setRouteDestKey] = useState<string | null>(null);
  const lastOrigin = useRef<UserLocationFix | null>(null);
  const lastDestKey = useRef<string | null>(null);
  const destKey = dest ? `${dest.id}:${dest.lat},${dest.lng}` : null;

  useEffect(() => {
    if (!dest || !origin || !destKey) {
      lastOrigin.current = null;
      lastDestKey.current = null;
      return;
    }

    const destChanged = lastDestKey.current !== destKey;
    const originMoved = shouldRefetchForOriginMove(lastOrigin.current, origin);
    if (!destChanged && !originMoved && routeDestKey === destKey && route) {
      return;
    }

    const ac = new AbortController();
    let cancelled = false;
    lastDestKey.current = destKey;

    fetchWalkingRoute(
      { lat: origin.lat, lng: origin.lng },
      { lat: dest.lat, lng: dest.lng },
      {
        signal: ac.signal,
        forceStraight:
          typeof navigator !== "undefined" && navigator.onLine === false,
      },
    ).then((next) => {
      if (cancelled) return;
      lastOrigin.current = origin;
      setRoute(next);
      setRouteDestKey(destKey);
    });

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- throttle via refs
  }, [destKey, origin?.lat, origin?.lng, dest?.lat, dest?.lng, dest?.id]);

  if (!dest || !origin) return null;
  if (!route || routeDestKey !== destKey) return null;
  return route;
}

/** Draw walking geometry (OSRM or straight). */
export function WalkingNavLayer({
  dest,
  route,
}: {
  dest: WalkingNavDest | null;
  route: WalkingRouteResult | null;
}) {
  if (!dest || !route || route.positions.length < 2) return null;

  return (
    <>
      <FitWalkingRoute positions={route.positions} destId={dest.id} />
      <Polyline
        positions={route.positions}
        pathOptions={{
          color: "#ffffff",
          weight: 8,
          opacity: 0.35,
          lineJoin: "round",
          lineCap: "round",
        }}
        interactive={false}
      />
      <Polyline
        positions={route.positions}
        pathOptions={{
          color: NAV_BLUE,
          weight: 5,
          opacity: 0.92,
          lineJoin: "round",
          lineCap: "round",
        }}
        interactive={false}
      />
    </>
  );
}

export function WalkingNavClearButton({
  dest,
  origin,
  route,
  onClear,
}: {
  dest: WalkingNavDest | null;
  origin: UserLocationFix | null;
  route: WalkingRouteResult | null;
  onClear: () => void;
}) {
  const { t } = useT();
  if (!dest) return null;

  const eta = formatWalkEta(route?.durationSeconds, route?.distanceMeters);
  const title =
    origin == null
      ? t("map.walkNeedsLocation")
      : eta.minutes != null
        ? t("map.walkEta", { name: dest.name, n: eta.minutes })
        : t("map.walkTo", { name: dest.name });

  return (
    <button
      type="button"
      aria-label={t("map.clearWalk")}
      title={title}
      onClick={onClear}
      className={`${MAP_CORNER_BTN_SM} max-w-[9.5rem] gap-1 px-2 text-[11px] font-medium text-[#1a73e8]`}
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
      </svg>
      <span className="truncate">{t("map.clearWalk")}</span>
    </button>
  );
}
