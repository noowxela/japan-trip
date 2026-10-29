"use client";

import nextDynamic from "next/dynamic";
import type { DayMapPin } from "@/components/day-map";
import { MapAreaSkeleton } from "@/components/page-skeletons";

const DayMap = nextDynamic(() => import("@/components/day-map"), {
  ssr: false,
  loading: () => <MapAreaSkeleton />,
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
