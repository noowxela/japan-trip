"use client";

import nextDynamic from "next/dynamic";
import type { DayMapPin } from "@/components/day-map";

const DayMap = nextDynamic(() => import("@/components/day-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-52 items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500 sm:h-64 md:h-72">
      Loading map…
    </div>
  ),
});

export function DayMapLoader({
  city,
  pins,
}: {
  city: string | null;
  pins: DayMapPin[];
}) {
  return <DayMap city={city} pins={pins} />;
}
