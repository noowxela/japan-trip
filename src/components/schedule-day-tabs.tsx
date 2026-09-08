"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { formatTabDate, tokyoToday } from "@/lib/format";
import type { TripDay } from "@/lib/types";

const TAB_WIDTH_PX = 88;

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fromScrollRef = useRef(false);
  const readyRef = useRef(false);
  const settleTimer = useRef(0);
  const scrolledRef = useRef(false);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  selectedIdRef.current = selectedId;
  onSelectRef.current = onSelect;

  const items = useMemo(
    () => [
      { id: "all", dateLabel: "All", dayLabel: "Days", isToday: false },
      ...days.map((day, index) => {
        const isToday = day.date?.slice(0, 10) === today;
        return {
          id: day.id,
          dateLabel: formatTabDate(day.date),
          dayLabel: `Day ${index + 1}${isToday ? " · Today" : ""}`,
          isToday,
        };
      }),
    ],
    [days, today],
  );

  const scrollToId = useCallback((id: string, behavior: ScrollBehavior) => {
    const root = scrollerRef.current;
    const el = root?.querySelector<HTMLElement>(`[data-day-id="${id}"]`);
    if (!root || !el) return;
    root.scrollTo({
      left: el.offsetLeft - (root.clientWidth - el.offsetWidth) / 2,
      behavior,
    });
  }, []);

  useLayoutEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      return;
    }
    scrollToId(selectedId, readyRef.current ? "smooth" : "instant");
    readyRef.current = true;
  }, [selectedId, scrollToId, items.length]);

  const nearestId = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return null;
    const mid = root.scrollLeft + root.clientWidth / 2;
    let bestId = items[0]?.id ?? null;
    let bestDist = Infinity;
    for (const item of items) {
      const el = root.querySelector<HTMLElement>(`[data-day-id="${item.id}"]`);
      if (!el) continue;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = item.id;
      }
    }
    return bestId;
  }, [items]);

  function commitCenteredDay() {
    const id = nearestId();
    if (!id || id === selectedIdRef.current) return;
    fromScrollRef.current = true;
    onSelectRef.current(id);
  }

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onScrollEnd = () => commitCenteredDay();
    root.addEventListener("scrollend", onScrollEnd);
    return () => {
      root.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(settleTimer.current);
    };
  }, [nearestId]);

  function onScroll() {
    scrolledRef.current = true;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(commitCenteredDay, 80);
  }

  return (
    <div className="relative shrink-0 border-b border-stone-100 bg-white">
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label="Trip days"
        onPointerDown={() => {
          scrolledRef.current = false;
        }}
        onScroll={onScroll}
        className="flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none"
        style={{
          paddingLeft: `calc(50% - ${TAB_WIDTH_PX / 2}px)`,
          paddingRight: `calc(50% - ${TAB_WIDTH_PX / 2}px)`,
        }}
      >
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-day-id={item.id}
              onClick={() => {
                if (scrolledRef.current) return;
                onSelect(item.id);
              }}
              className={`relative flex h-[3.7rem] w-22 shrink-0 snap-center snap-always touch-pan-x flex-col items-center justify-center px-1 text-center transition-colors ${
                active ? "text-hanko" : "text-stone-400"
              }`}
            >
              <span className="text-sm font-medium leading-tight">
                {item.dateLabel}
              </span>
              <span className="mt-0.5 text-xs leading-tight">{item.dayLabel}</span>
            </button>
          );
        })}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-0.5 w-10 rounded-full bg-hanko"
      />
    </div>
  );
}
