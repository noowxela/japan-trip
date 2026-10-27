"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  MAP_STYLE_IDS,
  MAP_STYLES,
  isAppDarkTheme,
  readMapStyle,
  resolveMapStyle,
  writeMapStyle,
  type MapStyleId,
} from "@/lib/map-styles";
import { useT } from "@/components/i18n-provider";
import { MAP_CORNER_BTN, MAP_CORNER_BTN_SM } from "@/components/map-zoom-buttons";

const MAP_STYLE_CHANGED = "japan-trip-map-style-changed";

function subscribeMapStyle(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === "japan-trip-map-style") onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(MAP_STYLE_CHANGED, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(MAP_STYLE_CHANGED, onStoreChange);
  };
}

function subscribeTheme(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function useMapStyle() {
  const saved = useSyncExternalStore(
    subscribeMapStyle,
    readMapStyle,
    () => null,
  );
  const appDark = useSyncExternalStore(
    subscribeTheme,
    isAppDarkTheme,
    () => false,
  );

  const pick = useCallback((next: MapStyleId) => {
    writeMapStyle(next);
    window.dispatchEvent(new Event(MAP_STYLE_CHANGED));
  }, []);

  const id = resolveMapStyle(saved, appDark);

  return { id, saved, pick, tiles: MAP_STYLES[id], appDark };
}

export function MapStyleSwitch({
  id,
  onChange,
  className,
  compact = false,
  size = "md",
}: {
  id: MapStyleId;
  onChange: (id: MapStyleId) => void;
  /** Override root positioning (e.g. when embedded in a corner stack). */
  className?: string;
  /** Icon-only square control for vertical stacks. */
  compact?: boolean;
  /** Compact stack size: `sm` = 36px (schedule map). */
  size?: "md" | "sm";
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={
        className ??
        "absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-[1000]"
      }
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("map.layers")}
        title={t("map.layers")}
        onClick={() => setOpen((value) => !value)}
        className={
          compact
            ? size === "sm"
              ? MAP_CORNER_BTN_SM
              : MAP_CORNER_BTN
            : "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-line bg-surface/95 px-3.5 text-sm font-medium text-ink shadow-sm backdrop-blur"
        }
      >
        <LayersIcon />
        {compact ? null : <span className="pr-0.5">{t("map.layers")}</span>}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("map.layers")}
          className="absolute right-0 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-lg"
        >
          {MAP_STYLE_IDS.map((style) => {
            const active = style === id;
            return (
              <button
                key={style}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(style);
                  setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center px-4 text-left text-sm font-medium ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-ink hover:bg-canvas"
                }`}
              >
                {t(`map.style.${style}`)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function LayersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </svg>
  );
}
