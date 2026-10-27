export type MapStyleDef = {
  label: string;
  url: string;
  attribution: string;
  maxZoom?: number;
  /** Optional label / reference overlay (Esri Canvas Reference, etc.). */
  overlayUrl?: string;
};

const ESRI_ATTR =
  'Tiles &copy; Esri — Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const MAP_STYLES = {
  streets: {
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  voyager: {
    label: "Soft",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTR,
  },
  light: {
    label: "Light",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    overlayUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 16,
    attribution: ESRI_ATTR,
  },
  dark: {
    label: "Dark",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    overlayUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 16,
    attribution: ESRI_ATTR,
  },
  satellite: {
    label: "Sat",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
} as const satisfies Record<string, MapStyleDef>;

export type MapStyleId = keyof typeof MAP_STYLES;

export const MAP_STYLE_IDS = Object.keys(MAP_STYLES) as MapStyleId[];

const STORAGE_KEY = "japan-trip-map-style";

export function isMapStyleId(value: string | null | undefined): value is MapStyleId {
  return Boolean(value && value in MAP_STYLES);
}

export function readMapStyle(): MapStyleId | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isMapStyleId(saved)) return saved;
  return null;
}

export function writeMapStyle(id: MapStyleId) {
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearMapStyle() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Prefer explicit user pick; otherwise dark tiles when the app theme is dark. */
export function resolveMapStyle(
  saved: MapStyleId | null,
  appDark: boolean,
): MapStyleId {
  if (saved && isMapStyleId(saved)) return saved;
  return appDark ? "dark" : "streets";
}

export function isAppDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-theme") === "dark";
}
