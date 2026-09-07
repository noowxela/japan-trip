"use client";

import { useEffect } from "react";
import { writeTripCache, type TripSnapshot } from "@/lib/trip-cache";

export function TripCacheSync({ snapshot }: { snapshot: TripSnapshot }) {
  useEffect(() => {
    writeTripCache(snapshot);
  }, [snapshot]);
  return null;
}
