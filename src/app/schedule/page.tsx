import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { NotionNotReady } from "@/components/notion-not-ready";
import { ScheduleOfflineFallback } from "@/components/schedule-offline";
import { ScheduleView } from "@/components/schedule-view";
import { QuickExpenseTripSync } from "@/components/quick-expense-provider";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { schedulePropsFromSnapshot } from "@/lib/schedule-pins";
import { getEditorNames, unvisitedFromPastDays } from "@/lib/trip";
import { loadTripSnapshot } from "@/lib/trip-snapshot";
import { tokyoToday } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; mode?: string }>;
}) {
  const locale = await getLocale();
  if (!notionReady()) {
    return <NotionNotReady backHref="/" />;
  }

  const { day: dayParam, mode: modeParam } = await searchParams;
  const bareSchedule = dayParam == null && modeParam == null;

  let snapshot;
  try {
    snapshot = await loadTripSnapshot();
  } catch {
    return (
      <ScheduleOfflineFallback
        dayParam={dayParam}
        modeParam={modeParam}
        bareSchedule={bareSchedule}
      />
    );
  }

  const props = schedulePropsFromSnapshot(snapshot, dayParam, {
    preferTodayDuringTrip: bareSchedule,
  });
  if (!props) {
    return (
      <>
        <div className="mx-auto max-w-xl px-4 py-6 md:max-w-5xl md:px-8">
          <EmptyState title={t(locale, "schedule.noDaysTitle")}>
            {t(locale, "schedule.noDaysBody")}{" "}
            <Link href="/settings" className="font-medium text-ink-muted no-underline">
              {t(locale, "schedule.settingsLink")}
            </Link>
          </EmptyState>
        </div>
      </>
    );
  }

  const today = tokyoToday();
  const nowIso = new Date().toISOString();
  const people = await getEditorNames();
  const carryOver = unvisitedFromPastDays(props.days, props.places, today);

  const wantNow =
    modeParam === "now" || (bareSchedule && props.phase === "during");
  const initialMode =
    modeParam === "edit"
      ? ("edit" as const)
      : wantNow && props.nowModeAllowed
        ? ("now" as const)
        : ("view" as const);

  return (
    <>
      <TripCacheSync snapshot={snapshot} />
      <QuickExpenseTripSync days={props.days} people={people} />
      <ScheduleView
        days={props.days}
        places={props.places}
        byDay={props.byDay}
        allPins={props.allPins}
        initialDayId={props.initialDayId}
        initialMode={initialMode}
        people={people}
        carryOver={carryOver}
        today={today}
        phase={props.phase}
        nowIso={nowIso}
      />
    </>
  );
}
