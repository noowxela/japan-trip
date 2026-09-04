import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ScheduleView } from "@/components/schedule-view";
import { tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import {
  buildScheduleSlices,
  pinsForAllDays,
} from "@/lib/schedule-pins";
import { getDays, getPlaces, getTransit, pickFocusDay } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
          <p className="mt-4 text-center text-sm">
            <Link href="/" className="font-medium text-hanko">
              Back to Overview
            </Link>
          </p>
        </div>
      </>
    );
  }

  const { day: dayParam } = await searchParams;
  const [days, places, transit] = await Promise.all([
    getDays(),
    getPlaces(),
    getTransit(),
  ]);

  if (days.length === 0) {
    return (
      <>
        <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
          <EmptyState title="No days yet">
            Add trip days in{" "}
            <Link href="/settings" className="font-medium text-hanko">
              Settings
            </Link>
            .
          </EmptyState>
        </div>
      </>
    );
  }

  const today = tokyoToday();
  const focusDay = pickFocusDay(days, today) ?? days[0];
  const initialDayId =
    dayParam === "all" || days.some((day) => day.id === dayParam)
      ? (dayParam as string)
      : focusDay.id;

  return (
    <>
      <ScheduleView
        days={days}
        places={places}
        byDay={buildScheduleSlices(days, places, transit)}
        allPins={pinsForAllDays(days, places)}
        initialDayId={initialDayId}
      />
    </>
  );
}
