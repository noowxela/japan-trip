"use client";

import { useLayoutEffect, useRef } from "react";
import { FLIGHT_PLANE_PATH } from "@/components/flight-plane-icon";
import {
  flightArcPath,
  flightArcPose,
  type FlightListLink,
} from "@/lib/flight-path";

const SVG_NS = "http://www.w3.org/2000/svg";

function supportsOffsetPath() {
  return (
    typeof CSS !== "undefined" &&
    CSS.supports("offset-path", "path('M 0 0 L 1 1')")
  );
}

function measure(list: HTMLElement, root: HTMLElement, links: FlightListLink[]) {
  const origin = root.getBoundingClientRect();
  const routes: { d: string; x: number; y1: number; y2: number }[] = [];
  for (const link of links) {
    const from = list.querySelector(
      `[data-flight-anchor="${CSS.escape(link.fromId)}"]`,
    );
    const to = list.querySelector(
      `[data-flight-anchor="${CSS.escape(link.toId)}"]`,
    );
    if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement)) continue;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const x = (a.left + a.right + b.left + b.right) / 4 - origin.left;
    const y1 = (a.top + a.bottom) / 2 - origin.top;
    const y2 = (b.top + b.bottom) / 2 - origin.top;
    if (Math.abs(y2 - y1) < 20) continue;
    routes.push({ d: flightArcPath(x, y1, y2), x, y1, y2 });
  }
  return routes;
}

function planeSvg() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", FLIGHT_PLANE_PATH);
  path.setAttribute("fill", "currentColor");
  path.setAttribute("transform", "rotate(90 12 12)");
  svg.append(path);
  return svg;
}

function paint(
  root: HTMLElement,
  routes: { d: string; x: number; y1: number; y2: number }[],
) {
  root.replaceChildren();
  if (routes.length === 0) return;
  const motion = supportsOffsetPath();
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "flight-route-lines");
  svg.setAttribute("aria-hidden", "true");
  for (const route of routes) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", route.d);
    svg.append(path);
    const plane = document.createElement("span");
    plane.className = "flight-route-plane";
    if (motion) {
      plane.style.offsetPath = `path('${route.d}')`;
    } else {
      const pose = flightArcPose(route.x, route.y1, route.y2, 0.38);
      plane.style.left = `${pose.x}px`;
      plane.style.top = `${pose.y}px`;
      plane.style.transform = `translate(-50%, -50%) rotate(${pose.angle}deg)`;
      plane.classList.add("flight-route-plane-static");
    }
    plane.append(planeSvg());
    root.append(plane);
  }
  root.prepend(svg);
}

/** Dashed gutter arc and a plane that flies from a departure row to its arrival. */
export function FlightRouteOverlay({
  listRef,
  links,
}: {
  listRef: React.RefObject<HTMLOListElement | null>;
  links: FlightListLink[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const linkKey = links.map((link) => `${link.fromId}>${link.toId}`).join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    const root = rootRef.current;
    if (!list || !root) return;
    let drawn = "";
    const draw = () => {
      const routes = measure(list, root, links);
      const key = routes.map((route) => route.d).join("~");
      if (key === drawn) return;
      drawn = key;
      paint(root, routes);
    };
    draw();
    const resize = new ResizeObserver(draw);
    resize.observe(list);
    const mutations = new MutationObserver(draw);
    mutations.observe(list, { childList: true, subtree: true });
    return () => {
      resize.disconnect();
      mutations.disconnect();
    };
  }, [listRef, linkKey, links]);

  if (!linkKey) return null;

  return (
    <div
      ref={rootRef}
      className="flight-route-layer pointer-events-none absolute inset-0 z-20 overflow-visible"
      aria-hidden
    />
  );
}
