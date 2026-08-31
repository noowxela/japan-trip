import Link from "next/link";
import { DayAgendaBoard } from "@/components/day-agenda-board";
import { DayMapLoader } from "@/components/day-map-loader";
import type { DayMapPin } from "@/components/day-map";
import { ScheduleDayTabs } from "@/components/schedule-day-tabs";
import { StatusBadge } from "@/components/status-badge";
import { formatDay } from "@/lib/format";
import type { AgendaItem, Place, TripDay } from "@/lib/types";

export function ScheduleView({
  days,
  selectedDay,
  agenda,
  pending,
  mapPins,
}: {
  days: TripDay[];
  selectedDay: TripDay;
  agenda: AgendaItem[];
  pending: Place[];
  mapPins: DayMapPin[];
}) {
  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col overflow-hidden md:h-[calc(100dvh-3.5rem)]">
      <div className="relative min-h-0 flex-1">
        <DayMapLoader
          city={selectedDay.city}
          pins={mapPins}
          className="h-full border-0"
        />
      </div>

      <div className="flex max-h-[min(48dvh,28rem)] min-h-[14rem] shrink-0 flex-col rounded-t-2xl border-t border-stone-200 bg-white shadow-[0_-4px_24px_rgba(28,25,23,0.08)]">
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-stone-300"
        />

        <ScheduleDayTabs days={days} selectedId={selectedDay.id} />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg tracking-tight">
                  {selectedDay.name}
                </h2>
                <StatusBadge status={selectedDay.status} />
              </div>
              <p className="mt-0.5 text-xs text-stone-500">
                {formatDay(selectedDay.date)}
                {selectedDay.city ? ` · ${selectedDay.city}` : ""}
              </p>
            </div>
            <Link
              href={`/days/${selectedDay.id}`}
              className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700"
            >
              Full day →
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
            <DayAgendaBoard
              agenda={agenda}
              pending={pending}
              dayId={selectedDay.id}
              dayDate={selectedDay.date}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
