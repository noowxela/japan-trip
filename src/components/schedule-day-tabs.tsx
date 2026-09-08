"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { formatTabDate, tokyoToday } from "@/lib/format";
import type { TripDay } from "@/lib/types";

const TAB_WIDTH_PX = 56;

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
  const itemEls = useRef<(HTMLButtonElement | null)[]>([]);
  const fromScrollRef = useRef(false);
  const movedRef = useRef(false);
  const rafRef = useRef(0);
  const settleTimer = useRef(0);
  const selectedIdRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const visualIdRef = useRef(selectedId);

  const items = useMemo(
    () => [
      { id: "all", dateLabel: "All", dayLabel: "Days" },
      ...days.map((day, index) => ({
        id: day.id,
        dateLabel: formatTabDate(day.date),
        dayLabel:
          day.date?.slice(0, 10) === today ? "Today" : `Day ${index + 1}`,
      })),
    ],
    [days, today],
  );

  const [visualId, setVisualId] = useState(selectedId);
  const hasScrollEnd =
    typeof window !== "undefined" && "onscrollend" in window;

  useEffect(() => {
    selectedIdRef.current = selectedId;
    onSelectRef.current = onSelect;
    visualIdRef.current = visualId;
  });

  const scrollToId = useCallback((id: string) => {
    const root = scrollerRef.current;
    const el = itemEls.current.find((node) => node?.dataset.dayId === id);
    if (!root || !el) return;
    root.scrollLeft = el.offsetLeft - (root.clientWidth - el.offsetWidth) / 2;
  }, []);

  useLayoutEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      setVisualId(selectedId);
      return;
    }
    setVisualId(selectedId);
    scrollToId(selectedId);
  }, [selectedId, scrollToId, items.length]);

  const nearestId = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return null;
    const mid = root.scrollLeft + root.clientWidth / 2;
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const el of itemEls.current) {
      if (!el) continue;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = el.dataset.dayId ?? null;
      }
    }
    return bestId;
  }, []);

  const commitCenteredDay = useCallback(() => {
    const id = nearestId();
    if (!id) return;
    setVisualId(id);
    if (id === selectedIdRef.current) return;
    fromScrollRef.current = true;
    onSelectRef.current(id);
  }, [nearestId]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const onScrollEnd = () => commitCenteredDay();
    root.addEventListener("scrollend", onScrollEnd, { passive: true });
    return () => {
      root.removeEventListener("scrollend", onScrollEnd);
      window.clearTimeout(settleTimer.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, [commitCenteredDay]);

  function onScroll() {
    movedRef.current = true;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const id = nearestId();
        if (id && id !== visualIdRef.current) setVisualId(id);
      });
    }
    if (hasScrollEnd) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(commitCenteredDay, 140);
  }

  return (
    <div className="relative shrink-0 border-b border-stone-100 bg-white">
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label="Trip days"
        onPointerDown={() => {
          movedRef.current = false;
        }}
        onScroll={onScroll}
        className="flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none"
        style={{
          paddingLeft: `calc(50% - ${TAB_WIDTH_PX / 2}px)`,
          paddingRight: `calc(50% - ${TAB_WIDTH_PX / 2}px)`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((item, index) => {
          const active = item.id === visualId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-day-id={item.id}
              ref={(node) => {
                itemEls.current[index] = node;
              }}
              onClick={() => {
                if (movedRef.current) return;
                onSelect(item.id);
              }}
              className={`flex h-12 w-14 shrink-0 snap-center touch-pan-x flex-col items-center justify-center text-center ${
                active ? "text-hanko" : "text-stone-400"
              }`}
            >
              <span className="text-[13px] font-medium leading-none">
                {item.dateLabel}
              </span>
              <span className="mt-1 text-[11px] leading-none">{item.dayLabel}</span>
            </button>
          );
        })}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-0.5 w-7 rounded-full bg-hanko"
      />
    </div>
  );
}
