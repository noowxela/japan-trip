"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { FLIGHT_PLANE_PATH } from "@/components/flight-plane-icon";
import { useHiddenMapPinIds } from "@/components/hide-map-pin-button";
import {
  flightLoopProgress,
  flightMapArcs,
  greatCircle,
  visibleSampleRange,
  type FlightRoute,
  type MapPinLike,
} from "@/lib/flight-path";

const PLANE_HTML = `<span class="flight-map-plane-rot"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" transform="rotate(90 12 12)" d="${FLIGHT_PLANE_PATH}"/></svg></span>`;

function planeIcon() {
  return L.divIcon({
    className: "flight-map-plane",
    html: PLANE_HTML,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function sampleAt(samples: L.LatLng[], t: number) {
  const max = samples.length - 1;
  const clamped = Math.min(1, Math.max(0, t));
  const f = clamped * max;
  const index = Math.min(max - 1, Math.floor(f));
  const local = f - index;
  const a = samples[index];
  const b = samples[index + 1];
  return {
    a,
    b,
    latlng: L.latLng(
      a.lat + (b.lat - a.lat) * local,
      a.lng + (b.lng - a.lng) * local,
    ),
  };
}

/**
 * Plane + dashed arc for each flight. The line is clipped to the current view
 * so a KLIA→Kansai leg still reads on a city zoom without changing fitBounds.
 * Markers and the polyline are non-interactive.
 */
export function FlightMapArcs({
  flights,
  pins,
}: {
  flights: FlightRoute[];
  pins: MapPinLike[];
}) {
  const map = useMap();
  const hiddenIds = useHiddenMapPinIds();
  const arcs = useMemo(
    () => flightMapArcs(flights, pins, hiddenIds),
    [flights, pins, hiddenIds],
  );

  useEffect(() => {
    if (arcs.length === 0) return;
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceQuery.matches;
    let raf = 0;
    let cancelled = false;
    const group = L.layerGroup().addTo(map);
    const planes = arcs.map((arc) => {
      const samples = greatCircle(arc.from, arc.to, 72).map((point) =>
        L.latLng(point.lat, point.lng),
      );
      const line = L.polyline([], {
        color: "var(--accent)",
        weight: 1.5,
        opacity: 0.45,
        dashArray: "3 6",
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(group);
      const marker = L.marker(samples[0], {
        icon: planeIcon(),
        interactive: false,
        keyboard: false,
        zIndexOffset: 900,
        bubblingMouseEvents: false,
      }).addTo(group);
      return { samples, line, marker };
    });

    const clipOf = (samples: L.LatLng[]) => {
      const size = map.getSize();
      const projected = samples.map((latlng) => {
        const point = map.latLngToContainerPoint(latlng);
        return { x: point.x, y: point.y };
      });
      const range = visibleSampleRange(projected, size.x, size.y, 0);
      if (!range) return [] as L.LatLng[];
      return samples.slice(range.start, range.end + 1);
    };

    const applyLines = () => {
      for (const plane of planes) {
        plane.line.setLatLngs(clipOf(plane.samples));
      }
    };

    const started = performance.now();
    const place = (now: number) => {
      if (cancelled) return;
      const t = reduce ? 0.72 : flightLoopProgress(now - started);
      for (const plane of planes) {
        const clip = clipOf(plane.samples);
        const element = plane.marker.getElement();
        if (clip.length < 2) {
          plane.marker.setOpacity(0);
          continue;
        }
        plane.marker.setOpacity(1);
        const pose = sampleAt(clip, t);
        plane.marker.setLatLng(pose.latlng);
        const rot = element?.querySelector(".flight-map-plane-rot");
        if (rot instanceof HTMLElement) {
          const p0 = map.latLngToContainerPoint(pose.a);
          const p1 = map.latLngToContainerPoint(pose.b);
          const bearing = (Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180) / Math.PI;
          rot.style.transform = `rotate(${bearing}deg)`;
        }
      }
      if (!reduce) raf = requestAnimationFrame(place);
    };

    applyLines();
    raf = requestAnimationFrame(place);
    const onView = () => applyLines();
    map.on("move zoom resize viewreset", onView);
    const onReduce = () => {
      reduce = reduceQuery.matches;
      cancelAnimationFrame(raf);
      raf = 0;
      if (!reduce && !cancelled) raf = requestAnimationFrame(place);
      else place(performance.now());
    };
    reduceQuery.addEventListener("change", onReduce);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      reduceQuery.removeEventListener("change", onReduce);
      map.off("move zoom resize viewreset", onView);
      group.remove();
    };
  }, [map, arcs]);

  return null;
}
