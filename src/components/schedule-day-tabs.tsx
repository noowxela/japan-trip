"use client";

import { formatTabDate, tokyoToday } from "@/lib/format";
import type { TripDay } from "@/lib/types";

const tabClass = (active: boolean) =>
  `relative flex min-w-[4.5rem] shrink-0 flex-col items-center px-3 py-3 text-center transition-colors ${
    active ? "text-hanko" : "text-stone-500 hover:text-stone-700"
  }`;

export function ScheduleDayTabs({
  days,
  selectedId,
  onSelect,
}: {
  days: TripDay[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const today = tokyoToday();
  const allActive = selectedId === "all";

  return (
    <div className="shrink-0 border-b border-stone-100 bg-white">
      <div className="mx-auto flex max-w-xl overflow-x-auto md:max-w-5xl">
        <button
          type="button"
          onClick={() => onSelect("all")}
          className={tabClass(allActive)}
        >
          <span className="text-sm font-medium leading-tight">All</span>
          <span className="mt-0.5 text-xs leading-tight">Days</span>
          {allActive ? (
            <span
              aria-hidden
              className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-hanko"
            />
          ) : null}
        </button>
        {days.map((day, index) => {
          const active = day.id === selectedId;
          const isToday = day.date?.slice(0, 10) === today;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onSelect(day.id)}
              className={tabClass(active)}
            >
              <span className="text-sm font-medium leading-tight">
                {formatTabDate(day.date)}
              </span>
              <span className="mt-0.5 text-xs leading-tight">
                Day {index + 1}
                {isToday ? " · Today" : ""}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-hanko"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
