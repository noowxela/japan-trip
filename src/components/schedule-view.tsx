"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { DayAgendaBoard } from "@/components/day-agenda-board";
import { DayMapLoader } from "@/components/day-map-loader";
import type { DayMapPin } from "@/components/day-map";
import { ScheduleDayTabs } from "@/components/schedule-day-tabs";
import { StatusBadge } from "@/components/status-badge";
import { formatDay } from "@/lib/format";
import type { AgendaItem, Place, TripDay } from "@/lib/types";

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
      className="flex h-[calc(100dvh-3.25rem)] flex-col overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:h-[calc(100dvh-3.5rem)] md:pb-0"
    >
      <div className="relative z-0 min-h-0 flex-1 isolate overflow-hidden">
        <DayMapLoader
          city={selectedDay.city}
          pins={mapPins}
          className="h-full border-0"
        />
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

          <ScheduleDayTabs days={days} selectedId={selectedDay.id} />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-6">
              <DayAgendaBoard
                agenda={agenda}
                pending={pending}
                dayId={selectedDay.id}
                dayDate={selectedDay.date}
              />
            </div>
          </div>
        </section>
    </div>
  );
}
