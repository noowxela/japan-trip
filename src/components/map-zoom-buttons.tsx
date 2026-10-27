"use client";

import { useMap } from "react-leaflet";
import { useT } from "@/components/i18n-provider";

/** Default 44px corner control (trip map). */
export const MAP_CORNER_BTN =
  "flex h-11 w-11 items-center justify-center rounded-sm border border-black/20 bg-surface text-ink shadow-sm";

/** Compact 36px corner control (schedule embedded map). */
export const MAP_CORNER_BTN_SM =
  "flex h-9 w-9 items-center justify-center rounded-sm border border-black/20 bg-surface text-ink shadow-sm";

export function MapZoomButtons({
  variant = "stack",
  className = "",
}: {
  /** `stack` — separate 44px buttons. `joined` — one 32px ± pair. */
  variant?: "stack" | "joined";
  className?: string;
}) {
  const map = useMap();
  const { t } = useT();

  if (variant === "joined") {
    const btn =
      "flex h-8 w-8 items-center justify-center text-ink hover:bg-canvas";
    return (
      <div
        className={`map-zoom-fine-only flex flex-col overflow-hidden rounded-sm border border-black/20 bg-surface shadow-sm ${className}`.trim()}
      >
        <button
          type="button"
          aria-label={t("map.zoomIn")}
          title={t("map.zoomIn")}
          onClick={() => map.zoomIn()}
          className={`${btn} border-b border-black/15`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={t("map.zoomOut")}
          title={t("map.zoomOut")}
          onClick={() => map.zoomOut()}
          className={btn}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      <button
        type="button"
        aria-label={t("map.zoomIn")}
        title={t("map.zoomIn")}
        onClick={() => map.zoomIn()}
        className={MAP_CORNER_BTN}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        aria-label={t("map.zoomOut")}
        title={t("map.zoomOut")}
        onClick={() => map.zoomOut()}
        className={MAP_CORNER_BTN}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
