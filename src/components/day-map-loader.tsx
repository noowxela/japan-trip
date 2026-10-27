"use client";

import nextDynamic from "next/dynamic";
import type { DayMapPin } from "@/components/day-map";
import { useT } from "@/components/i18n-provider";

function MapLoading() {
  const { t } = useT();
  return (
    <div className="flex h-full min-h-[inherit] items-center justify-center bg-canvas text-sm text-ink-muted">
      {t("map.loading")}
    </div>
  );
}

const DayMap = nextDynamic(() => import("@/components/day-map"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export function DayMapLoader({
  city,
  pins,
  className = "",
  fullscreen,
  onFullscreenChange,
}: {
  city: string | null;
  pins: DayMapPin[];
  className?: string;
  fullscreen?: boolean;
  onFullscreenChange?: (value: boolean) => void;
}) {
  return (
    <DayMap
      city={city}
      pins={pins}
      className={className}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
    />
  );
}
