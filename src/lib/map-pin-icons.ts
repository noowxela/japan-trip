import L from "leaflet";

export function sightNumberIcon(n: number, visited = false) {
  const bg = visited ? "var(--ok)" : "var(--accent)";
  const opacity = visited ? "0.72" : "1";
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${bg};color:#fff;font-size:12px;font-weight:600;opacity:${opacity};box-shadow:0 1px 4px rgba(0,0,0,.28)">${n}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function foodPinIcon(visited = false) {
  const fill = visited ? "var(--ok)" : "var(--maybe)";
  const opacity = visited ? "0.72" : "1";
  return L.divIcon({
    className: "day-map-pin",
    html: `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" style="opacity:${opacity}"><path fill="${fill}" stroke="#fff" stroke-width="1.4" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9.2" r="2.4" fill="#fff"/></svg>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    tooltipAnchor: [0, -17],
    popupAnchor: [0, -24],
  });
}

export function stayPinIcon(visited = false, selected = false) {
  const fill = visited ? "var(--ok)" : "var(--ok)";
  const opacity = visited ? "0.72" : "1";
  const size = selected ? 30 : 26;
  const ring = selected
    ? "filter:drop-shadow(0 0 0 2px var(--accent));"
    : "";
  return L.divIcon({
    className: "day-map-pin",
    html: `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" style="opacity:${opacity};${ring}"><path fill="${fill}" stroke="#fff" stroke-width="1.4" d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"/></svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 2],
  });
}

export function otherPinIcon(visited = false) {
  const bg = visited ? "var(--ok)" : "var(--accent)";
  const opacity = visited ? "0.72" : "1";
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${bg};opacity:${opacity};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.28)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
}

export function labelPinIcon(label: string, visited = false) {
  const bg = visited ? "var(--ok)" : "var(--accent)";
  const opacity = visited ? "0.72" : "1";
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:9999px;background:${bg};color:#fff;font-size:11px;font-weight:700;letter-spacing:0.02em;opacity:${opacity};box-shadow:0 1px 4px rgba(0,0,0,.28)">${label}</span>`,
    iconSize: [32, 28],
    iconAnchor: [16, 14],
    popupAnchor: [0, -16],
  });
}

/** Trip-wide day colours (not per-day sight numbers). */
export const DAY_PIN_COLORS = [
  "#c45c26",
  "#3f7d4e",
  "#55697a",
  "#92700f",
  "#0d9488",
  "#db2777",
  "#2563eb",
  "#7c3aed",
] as const;

export function dayPinColor(dayIndex: number) {
  return DAY_PIN_COLORS[Math.abs(dayIndex) % DAY_PIN_COLORS.length];
}

export function dayDotIcon(
  dayIndex: number,
  visited = false,
  selected = false,
) {
  const color = visited ? "var(--ok)" : dayPinColor(dayIndex);
  const size = selected ? 22 : 14;
  const border = selected ? "3px solid #fff" : "2px solid #fff";
  const opacity = visited ? "0.75" : "1";
  const ring = selected
    ? "box-shadow:0 0 0 2px var(--accent),0 1px 4px rgba(0,0,0,.28);"
    : "box-shadow:0 1px 4px rgba(0,0,0,.28);";
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};opacity:${opacity};border:${border};${ring}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

export function dayBadgeIcon(
  dayIndex: number,
  visited = false,
  selected = false,
) {
  const color = visited ? "var(--ok)" : dayPinColor(dayIndex);
  const label = `D${dayIndex + 1}`;
  const minW = selected ? 32 : 26;
  const height = selected ? 26 : 22;
  const fontSize = selected ? 11 : 10;
  const ring = selected
    ? "box-shadow:0 0 0 2px var(--accent),0 1px 4px rgba(0,0,0,.28);"
    : "box-shadow:0 1px 4px rgba(0,0,0,.28);";
  const opacity = visited ? "0.75" : "1";
  const iconW = selected ? 36 : 30;
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:${minW}px;height:${height}px;padding:0 5px;border-radius:9999px;background:${color};color:#fff;font-size:${fontSize}px;font-weight:700;letter-spacing:0.02em;opacity:${opacity};${ring}">${label}</span>`,
    iconSize: [iconW, height],
    iconAnchor: [iconW / 2, height / 2],
    popupAnchor: [0, -height / 2 - 4],
  });
}

/** Light-mode ink — keep dark pill + white text in both themes for contrast. */
const INK_PILL_BG = "#1c1917";

/** Grouped day badge when multiple day pins overlap in pixel space. */
export function dayGroupBadgeIcon(label: string) {
  const wide = label.length > 4;
  const minW = wide ? 36 : 28;
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:${minW}px;height:24px;padding:0 7px;border-radius:9999px;background:${INK_PILL_BG};color:#fff;font-size:10px;font-weight:700;letter-spacing:0.02em;box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap">${label}</span>`,
    iconSize: [wide ? 48 : 34, 24],
    iconAnchor: [wide ? 24 : 17, 12],
    popupAnchor: [0, -14],
  });
}

export function clusterCountIcon(count: number) {
  return L.divIcon({
    className: "day-map-pin",
    html: `<span style="display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:9999px;background:${INK_PILL_BG};color:#fff;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.3)">${count}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}
