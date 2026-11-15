"use client";

import nextDynamic from "next/dynamic";
import type { DayMapFocus, DayMapPin } from "@/components/day-map";
import type { FlightRoute } from "@/lib/flight-path";
import { MapAreaSkeleton } from "@/components/page-skeletons";

const DayMap = nextDynamic(() => import("@/components/day-map"), {
  ssr: false,
  loading: () => <MapAreaSkeleton />,
});

export function DayMapLoader({
  city,
  pins,
  flights = [],
  className = "",
  fullscreen,
  onFullscreenChange,
  focus,
}: {
  city: string | null;
  pins: DayMapPin[];
  flights?: FlightRoute[];
  className?: string;
  fullscreen?: boolean;
  onFullscreenChange?: (value: boolean) => void;
  focus?: DayMapFocus | null;
}) {
  return (
    <DayMap
      city={city}
      pins={pins}
      flights={flights}
      className={className}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      focus={focus}
    />
  );
}
