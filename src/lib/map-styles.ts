export const MAP_STYLES = {
  streets: {
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  voyager: {
    label: "Soft",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    label: "Sat",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;

export const MAP_STYLE_IDS = Object.keys(MAP_STYLES) as MapStyleId[];

const STORAGE_KEY = "japan-trip-map-style";

export function readMapStyle(): MapStyleId {
  if (typeof window === "undefined") return "streets";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && saved in MAP_STYLES) return saved as MapStyleId;
  return "streets";
}

export function writeMapStyle(id: MapStyleId) {
  window.localStorage.setItem(STORAGE_KEY, id);
}
