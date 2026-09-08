"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DayAgendaBoard } from "@/components/day-agenda-board";
import { DayMapLoader } from "@/components/day-map-loader";
import { useHiddenMapPinIds } from "@/components/hide-map-pin-button";
import { ScheduleDayTabs } from "@/components/schedule-day-tabs";
import { formatCachedAt, formatDay, formatTripSpan } from "@/lib/format";
import { toggleHiddenMapPin } from "@/lib/hidden-map-pins";
import type { DayScheduleSlice, SchedulePin } from "@/lib/schedule-pins";
import type { Place, Stay, TripDay } from "@/lib/types";

const SNAPS = [0.4, 0.68, 0.92] as const;
const DEFAULT_SNAP = 1;
const TAP_SLOP_PX = 10;

function nearestSnap(fraction: number) {
  let best = 0;
  let bestDist = Infinity;
  SNAPS.forEach((snap, index) => {
    const dist = Math.abs(snap - fraction);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  });
  return best;
}

export function ScheduleView({
  days,
  places,
  byDay,
  allPins,
  initialDayId,
  cachedAt = null,
}: {
  days: TripDay[];
  places: Place[];
  byDay: Record<string, DayScheduleSlice>;
  allPins: SchedulePin[];
  initialDayId: string;
  cachedAt?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(initialDayId);
  const selectedDay =
    selectedId === "all"
      ? null
      : days.find((day) => day.id === selectedId) ?? days[0] ?? null;
  const slice = selectedDay ? byDay[selectedDay.id] : null;
  const agenda = slice?.agenda ?? [];
  const pending = slice?.pending ?? [];
  const lodging = slice?.stays ?? [];
  const mapPins = selectedDay ? (slice?.mapPins ?? []) : allPins;
  const mapCity =
    selectedDay?.city ?? days.find((day) => day.city)?.city ?? null;

  const selectDay = useCallback((id: string) => {
    setSelectedId(id);
    const url = `/schedule?day=${encodeURIComponent(id)}`;
    window.history.replaceState(window.history.state, "", url);
  }, []);

  useEffect(() => {
    function onPopState() {
      const day = new URLSearchParams(window.location.search).get("day");
      if (!day) return;
      if (day === "all" || days.some((item) => item.id === day)) {
        setSelectedId(day);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [days]);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    moved: boolean;
  } | null>(null);
  const [snapIndex, setSnapIndex] = useState(DEFAULT_SNAP);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const sheetHeight =
    dragHeight != null ? `${dragHeight}px` : `${SNAPS[snapIndex] * 100}%`;
  const expanded = snapIndex === SNAPS.length - 1 && dragHeight == null;

  const clampHeight = useCallback((next: number) => {
    const rootH = rootRef.current?.clientHeight ?? 0;
    if (rootH <= 0) return next;
    const min = rootH * SNAPS[0];
    const max = rootH * SNAPS[SNAPS.length - 1];
    return Math.min(max, Math.max(min, next));
  }, []);

  const endDrag = useCallback(
    (clientY: number) => {
      const drag = dragRef.current;
      const rootH = rootRef.current?.clientHeight ?? 0;
      dragRef.current = null;
      if (!drag || rootH <= 0) {
        setDragHeight(null);
        return;
      }

      if (!drag.moved) {
        setDragHeight(null);
        return;
      }

      skipClickRef.current = true;
      const height = clampHeight(drag.startHeight + (drag.startY - clientY));
      setSnapIndex(nearestSnap(height / rootH));
      setDragHeight(null);
    },
    [clampHeight],
  );

  function onHandlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const sheet = event.currentTarget.parentElement;
    if (!sheet) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: sheet.getBoundingClientRect().height,
      moved: false,
    };
  }

  function onHandlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = drag.startY - event.clientY;
    if (Math.abs(delta) > TAP_SLOP_PX) drag.moved = true;
    if (!drag.moved) return;
    setDragHeight(clampHeight(drag.startHeight + delta));
  }

  function onHandlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    endDrag(event.clientY);
  }

  function onHandleClick() {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    setSnapIndex((index) =>
      index === SNAPS.length - 1 ? DEFAULT_SNAP : SNAPS.length - 1,
    );
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowUp" || event.key === "Home") {
      event.preventDefault();
      setSnapIndex((index) =>
        event.key === "Home" ? SNAPS.length - 1 : Math.min(SNAPS.length - 1, index + 1),
      );
    } else if (event.key === "ArrowDown" || event.key === "End") {
      event.preventDefault();
      setSnapIndex((index) => (event.key === "End" ? 0 : Math.max(0, index - 1)));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSnapIndex((index) =>
        index === SNAPS.length - 1 ? DEFAULT_SNAP : SNAPS.length - 1,
      );
    }
  }

  return (
    <div
      ref={rootRef}
      className="flex h-dvh flex-col overflow-hidden"
    >
      <div className="relative z-0 min-h-0 flex-1 isolate overflow-hidden">
        <DayMapLoader
          city={mapCity}
          pins={mapPins}
          className="h-full border-0"
        />
        <Link
          href="/"
          aria-label="Back to Overview"
          className="absolute left-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-1100 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm backdrop-blur"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M15 18 9 12l6-6" />
          </svg>
        </Link>
        {cachedAt ? (
          <p className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-1100 max-w-[70%] rounded-full bg-white/90 px-3 py-2 text-right text-[11px] font-medium text-stone-600 shadow-sm backdrop-blur">
            Saved itinerary · {formatCachedAt(cachedAt)}
          </p>
        ) : null}
      </div>

      <section
        className="relative z-20 flex min-h-64 shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-stone-200 bg-white shadow-[0_-8px_32px_rgba(28,25,23,0.12)]"
        style={{
          height: sheetHeight,
          maxHeight: "calc(100% - 2.75rem)",
          transition: dragHeight == null ? "height 220ms ease" : "none",
        }}
      >
          <button
            type="button"
            aria-label={expanded ? "Collapse schedule" : "Expand schedule"}
            aria-expanded={expanded}
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            onClick={onHandleClick}
            onKeyDown={onHandleKeyDown}
            className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 pb-1 active:cursor-grabbing"
          >
            <span className="h-1 w-10 rounded-full bg-stone-300" />
            <span className="mt-1 text-[10px] font-medium tracking-wide text-stone-400">
              {expanded ? "Drag down for map" : "Drag up for full schedule"}
            </span>
          </button>

          <ScheduleDayTabs
            days={days}
            selectedId={selectedDay?.id ?? "all"}
            onSelect={selectDay}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedDay ? (
              <div
                key={selectedDay.id}
                className="schedule-pane min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {selectedDay.name}
                      </h2>
                      {lodging.map((stay) => (
                        <StayLocationBadge key={stay.id} stay={stay} />
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/days/${selectedDay.id}`}
                    className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700"
                  >
                    Full day →
                  </Link>
                </div>
                <div className="px-4 py-3">
                  <DayAgendaBoard
                    agenda={agenda}
                    pending={pending}
                    dayId={selectedDay.id}
                    dayDate={selectedDay.date}
                  />
                </div>
              </div>
            ) : (
              <AllDaysPanel days={days} places={places} onSelectDay={selectDay} />
            )}
          </div>
        </section>
    </div>
  );
}

function StayLocationBadge({ stay }: { stay: Stay }) {
  const hiddenIds = useHiddenMapPinIds();
  const hidden = hiddenIds.has(stay.id);
  const label = hidden
    ? `Show ${stay.name} on the map`
    : `Hide ${stay.name} from the map`;

  return (
    <span
      title={stay.address || stay.name}
      className={`inline-flex max-w-56 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        hidden
          ? "bg-stone-100 text-stone-400"
          : "bg-emerald-50 text-emerald-800"
      }`}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={hidden}
        title={hidden ? "Show on map" : "Hide from map"}
        onClick={() => toggleHiddenMapPin(stay.id)}
        className="-ml-0.5 inline-flex shrink-0 rounded-full p-0.5 hover:bg-black/5"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10h18M5 10V8l7-4 7 4v2M5 10v10h14V10M9 20v-6h6v6" />
          {hidden ? <path d="M4 20 20 4" /> : null}
        </svg>
      </button>
      <span className="truncate">{stay.name}</span>
    </span>
  );
}

function useSuppressClickAfterScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const list = el.querySelector("ul");
    let ignoreClick = false;
    let restoreTimer = 0;

    const onPointerDown = () => {
      ignoreClick = false;
    };
    const onScroll = () => {
      ignoreClick = true;
      if (list) list.style.pointerEvents = "none";
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        if (list) list.style.pointerEvents = "";
      }, 150);
    };
    const onClickCapture = (event: MouseEvent) => {
      if (!ignoreClick) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      ignoreClick = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("click", onClickCapture, true);
    return () => {
      window.clearTimeout(restoreTimer);
      if (list) list.style.pointerEvents = "";
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return ref;
}

function AllDaysPanel({
  days,
  places,
  onSelectDay,
}: {
  days: TripDay[];
  places: Place[];
  onSelectDay: (id: string) => void;
}) {
  const scrollerRef = useSuppressClickAfterScroll();
  const dated = days.filter((day) => day.date);
  const span = formatTripSpan(
    dated[0]?.date ?? null,
    dated[dated.length - 1]?.date ?? null,
  );

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="border-b border-stone-100 px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">All days</h2>
        <p className="mt-0.5 text-xs text-stone-500">{span}</p>
      </div>
      <ul className="space-y-4 px-4 pb-3">
        {days.map((day, index) => {
          const items = places.filter(
            (place) =>
              place.dayIds.includes(day.id) && !place.pending,
          );
          return (
            <li key={day.id}>
              <AllDayJumpButton
                day={day}
                index={index}
                onSelectDay={onSelectDay}
              />
              {items.length === 0 ? (
                <p className="mt-1 text-sm text-stone-400">No places yet</p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {items.map((place) => (
                    <li key={place.id} className="text-sm text-stone-600">
                      {place.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AllDayJumpButton({
  day,
  index,
  onSelectDay,
}: {
  day: TripDay;
  index: number;
  onSelectDay: (id: string) => void;
}) {
  const skipClickRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        originRef.current = { x: event.clientX, y: event.clientY };
        skipClickRef.current = false;
      }}
      onPointerMove={(event) => {
        const origin = originRef.current;
        if (!origin) return;
        if (
          Math.abs(event.clientX - origin.x) > TAP_SLOP_PX ||
          Math.abs(event.clientY - origin.y) > TAP_SLOP_PX
        ) {
          skipClickRef.current = true;
        }
      }}
      onPointerUp={() => {
        originRef.current = null;
      }}
      onPointerCancel={() => {
        skipClickRef.current = true;
        originRef.current = null;
      }}
      onClick={() => {
        if (skipClickRef.current) {
          skipClickRef.current = false;
          return;
        }
        onSelectDay(day.id);
      }}
      className="flex w-full touch-pan-y items-baseline justify-between gap-3 text-left"
    >
      <span className="min-w-0 font-semibold">
        <span className="text-hanko">D{index + 1}</span> {day.name}
      </span>
      <span className="shrink-0 text-xs text-stone-500">
        {formatDay(day.date)}
      </span>
    </button>
  );
}
