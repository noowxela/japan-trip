"use client";

import nextDynamic from "next/dynamic";
import type { DayMapPin } from "@/components/day-map";

const DayMap = nextDynamic(() => import("@/components/day-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[inherit] items-center justify-center bg-stone-100 text-sm text-stone-500">
      Loading map…
    </div>
  ),
});

export function DayMapLoader({
  city,
  pins,
  className = "",
}: {
  city: string | null;
  pins: DayMapPin[];
  className?: string;
}) {
  return <DayMap city={city} pins={pins} className={className} />;
}
