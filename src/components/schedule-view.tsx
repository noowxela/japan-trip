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
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-[calc(100dvh-4rem)]">
      <div className="relative min-h-[42dvh] flex-1 md:min-h-[45vh]">
        <DayMapLoader
          city={selectedDay.city}
          pins={mapPins}
          className="h-full min-h-[42dvh] border-0 md:min-h-[45vh]"
        />
      </div>

      <ScheduleDayTabs days={days} selectedId={selectedDay.id} />

      <section className="mx-auto flex w-full min-w-0 max-w-xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-28 md:max-w-5xl md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl tracking-tight">
                {selectedDay.name}
              </h1>
              <StatusBadge status={selectedDay.status} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {formatDay(selectedDay.date)}
              {selectedDay.city ? ` · ${selectedDay.city}` : ""}
            </p>
          </div>
          <Link
            href={`/days/${selectedDay.id}`}
            className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700"
          >
            Full day →
          </Link>
        </div>

        <DayAgendaBoard
          agenda={agenda}
          pending={pending}
          dayId={selectedDay.id}
          dayDate={selectedDay.date}
        />
      </section>
    </div>
  );
}
