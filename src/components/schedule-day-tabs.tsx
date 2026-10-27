"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  formatTabDayNumber,
  formatTabWeekday,
  tokyoToday,
} from "@/lib/format";
import type { TripDay } from "@/lib/types";

const TAB_WIDTH_PX = 52;

type TabMotion = {
  scale: number;
  opacity: number;
  color: string;
};

export function ScheduleDayTabs({
  days,
  selectedId,
  onSelect,
}: {
  days: TripDay[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { t, locale } = useT();
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
      {
        id: "all",
        weekday: t("schedule.tabTrip"),
        dayNum: t("schedule.tabAll"),
        isToday: false,
      },
      ...days.map((day) => ({
        id: day.id,
        weekday: formatTabWeekday(day.date, locale),
        dayNum: formatTabDayNumber(day.date),
        isToday: day.date?.slice(0, 10) === today,
      })),
    ],
    [days, locale, t, today],
  );

  const [visualId, setVisualId] = useState(selectedId);
  const [motion, setMotion] = useState<Record<string, TabMotion>>({});
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

  const measure = useCallback(() => {
    const root = scrollerRef.current;
    if (!root) return { bestId: null as string | null, byId: {} as Record<string, TabMotion> };
    const mid = root.scrollLeft + root.clientWidth / 2;
    const byId: Record<string, TabMotion> = {};
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const el of itemEls.current) {
      if (!el) continue;
      const id = el.dataset.dayId;
      if (!id) continue;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      const t = Math.min(1, dist / TAB_WIDTH_PX);
      byId[id] = {
        scale: 1.08 - t * 0.22,
        opacity: 1 - t * 0.48,
        color: `color-mix(in srgb, var(--ink-muted) ${Math.round(t * 100)}%, var(--ink))`,
      };
      if (dist < bestDist) {
        bestDist = dist;
        bestId = id;
      }
    }
    return { bestId, byId };
  }, []);

  const paintMotion = useCallback(() => {
    const next = measure();
    setMotion(next.byId);
    return next.bestId;
  }, [measure]);

  useLayoutEffect(() => {
    if (fromScrollRef.current) {
      fromScrollRef.current = false;
      setVisualId(selectedId);
      paintMotion();
      return;
    }
    setVisualId(selectedId);
    scrollToId(selectedId);
    paintMotion();
  }, [selectedId, scrollToId, paintMotion, items.length]);

  const commitCenteredDay = useCallback(() => {
    const id = paintMotion();
    if (!id) return;
    setVisualId(id);
    if (id === selectedIdRef.current) return;
    fromScrollRef.current = true;
    onSelectRef.current(id);
  }, [paintMotion]);

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
        paintMotion();
      });
    }
    if (hasScrollEnd) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(commitCenteredDay, 140);
  }

  return (
    <div className="relative z-10 shrink-0 border-b border-line bg-surface">
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={t("days.title")}
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
          const tab = motion[item.id];
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
              className="relative flex h-9 min-w-[3.25rem] origin-center shrink-0 snap-center touch-pan-x items-center justify-center gap-1 px-1.5 text-center text-ink-muted"
              style={
                tab
                  ? {
                      transform: `scale(${tab.scale})`,
                      opacity: tab.opacity,
                      color: tab.color,
                    }
                  : undefined
              }
            >
              <span className="text-[11px] font-medium leading-none">
                {item.weekday}
              </span>
              <span className="text-[13px] font-semibold tabular-nums leading-none">
                {item.dayNum}
              </span>
              {item.isToday ? (
                <span
                  aria-hidden
                  className="absolute bottom-0.5 h-1 w-1 rounded-full bg-accent"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-0.5 w-7 rounded-full bg-accent"
      />
    </div>
  );
}
