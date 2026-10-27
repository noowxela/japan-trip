"use client";

import nextDynamic from "next/dynamic";
import { useT } from "@/components/i18n-provider";
import type { TripMapDay, TripMapPin } from "@/components/trip-map";

function MapLoading() {
  const { t } = useT();
  return (
    <div className="flex h-full items-center justify-center bg-canvas text-sm text-ink-muted">
      {t("map.loading")}
    </div>
  );
}

const TripMap = nextDynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => <MapLoading />,
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
