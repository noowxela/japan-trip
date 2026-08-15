"use client";

import nextDynamic from "next/dynamic";

const TripMap = nextDynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-500">
      Loading map…
    </div>
  ),
});

type Pin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  dayId: string | null;
  dayName: string | null;
};

export function TripMapLoader({
  hops,
  pins,
}: {
  hops: string[];
  pins: Pin[];
}) {
  return <TripMap hops={hops} pins={pins} />;
}
