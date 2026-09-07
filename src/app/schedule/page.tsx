import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ScheduleOfflineFallback } from "@/components/schedule-offline";
import { ScheduleView } from "@/components/schedule-view";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { hasToken, isConfigured } from "@/lib/notion";
import { schedulePropsFromSnapshot } from "@/lib/schedule-pins";
import { loadTripSnapshot } from "@/lib/trip-snapshot";

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

  try {
    const snapshot = await loadTripSnapshot();
    const props = schedulePropsFromSnapshot(snapshot, dayParam);
    if (!props) {
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

    return (
      <>
        <TripCacheSync snapshot={snapshot} />
        <ScheduleView
          days={props.days}
          places={props.places}
          byDay={props.byDay}
          allPins={props.allPins}
          initialDayId={props.initialDayId}
        />
      </>
    );
  } catch {
    return <ScheduleOfflineFallback dayParam={dayParam} />;
  }
}
