"use client";

import { useEffect, useState } from "react";
import { departureCountdown } from "@/lib/departure-countdown";
import type { Locale } from "@/lib/i18n/dictionaries";
import { formatOverviewSummaryLine } from "@/lib/overview-summary";

const TICK_MS = 30_000;

function tokyoDateOf(ms: number) {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/**
 * Home summary line with a live departure countdown (hours under 48h, minutes
 * under 1h). First render uses the server's `initialNowMs` so SSR and hydration
 * match; the real clock takes over on mount and every 30s.
 */
export function DepartureSummary({
  tripStart,
  tripEnd,
  cityFlow,
  locale,
  dayCount,
  departureIso,
  initialNowMs,
}: {
  tripStart: string | null;
  tripEnd: string | null;
  cityFlow: string;
  locale: Locale;
  dayCount: number;
  departureIso: string | null;
  initialNowMs: number;
}) {
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    const tick = () => setNowMs(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  return formatOverviewSummaryLine({
    today: tokyoDateOf(nowMs),
    tripStart,
    tripEnd,
    cityFlow,
    locale,
    dayCount,
    departure: departureCountdown(departureIso, nowMs),
  });
}
