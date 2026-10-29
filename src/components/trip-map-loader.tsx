"use client";

import nextDynamic from "next/dynamic";
import { TripMapSkeleton } from "@/components/page-skeletons";
import type { TripMapDay, TripMapPin } from "@/components/trip-map";

const TripMap = nextDynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => <TripMapSkeleton />,
});

export function TripMapLoader({
  hops,
  hopPoints,
  pins,
  days,
}: {
  hops: string[];
  hopPoints?: [number, number][];
  pins: TripMapPin[];
  days: TripMapDay[];
}) {
  return (
    <TripMap hops={hops} hopPoints={hopPoints} pins={pins} days={days} />
  );
}
