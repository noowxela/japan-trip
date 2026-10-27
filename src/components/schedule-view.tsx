"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddAgendaForm } from "@/components/add-agenda-form";
import { AgendaEditTable } from "@/components/agenda-edit-table";
import {
  CarryOverBanner,
  DayAgendaBoard,
  PendingPanel,
} from "@/components/day-agenda-board";
import { CityKanji } from "@/components/city-kanji";
import { DayMapLoader } from "@/components/day-map-loader";
import { DayQuickFab } from "@/components/day-quick-fab";
import { DirectionsLink } from "@/components/directions-link";
import { useCanEdit } from "@/components/edit-session";
import { EditorLockButton } from "@/components/editor-lock-button";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { useHiddenMapPinIds } from "@/components/hide-map-pin-button";
import { useT } from "@/components/i18n-provider";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Modal } from "@/components/modal";
import { ScheduleDayTabs } from "@/components/schedule-day-tabs";
import { dateKey, formatCachedAt, formatDay, formatTime, formatTripSpan } from "@/lib/format";
import { toggleHiddenMapPin } from "@/lib/hidden-map-pins";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import type { DayScheduleSlice, SchedulePin } from "@/lib/schedule-pins";
import { nextAgendaItem } from "@/lib/trip-core";
import type { AgendaItem, Place, Stay, TripDay } from "@/lib/types";

/** Sheet height fractions; default leaves map ≈28dvh on phone. */
const SNAPS = [0.55, 0.72, 0.92] as const;
const DEFAULT_SNAP = 1;
const TAP_SLOP_PX = 10;

type ScheduleMode = "view" | "now" | "edit";

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

function writeScheduleUrl(dayId: string, mode: ScheduleMode) {
  const params = new URLSearchParams();
  params.set("day", dayId);
  if (mode === "now") params.set("mode", "now");
  if (mode === "edit") params.set("mode", "edit");
  const url = `/schedule?${params.toString()}`;
  window.history.replaceState(window.history.state, "", url);
}

export function ScheduleView({
  days,
  places,
  byDay,
  allPins,
  initialDayId,
  initialMode = "view",
  cachedAt = null,
  people = [],
  carryOver = [],
  today,
  phase,
  nowIso = null,
}: {
  days: TripDay[];
  places: Place[];
  byDay: Record<string, DayScheduleSlice>;
  allPins: SchedulePin[];
  initialDayId: string;
  initialMode?: ScheduleMode;
  cachedAt?: string | null;
  people?: string[];
  carryOver?: Place[];
  today: string;
  phase: "before" | "during" | "after" | "none";
  /** Server (or SW-cached) clock; first client render must match to avoid hydration #418. */
  nowIso?: string | null;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const canEdit = useCanEdit();
  const editOrUnlock = useEditOrUnlock();
  const [selectedId, setSelectedId] = useState(initialDayId);
  const [mode, setMode] = useState<ScheduleMode>(
    initialMode === "edit" && !canEdit ? "view" : initialMode,
  );
  const [nowMs, setNowMs] = useState(() => {
    if (nowIso) {
      const parsed = Date.parse(nowIso);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return Date.now();
  });
  const [pendingOpen, setPendingOpen] = useState(false);
  const scrolledForDayRef = useRef<string | null>(null);

  const selectedDay =
    selectedId === "all"
      ? null
      : days.find((day) => day.id === selectedId) ?? days[0] ?? null;
  const slice = selectedDay ? byDay[selectedDay.id] : null;
  const agenda = useMemo(() => slice?.agenda ?? [], [slice]);
  const pending = slice?.pending ?? [];
  const lodging = slice?.stays ?? [];
  const mapPins = selectedDay ? (slice?.mapPins ?? []) : allPins;
  const mapCity =
    selectedDay?.city ?? days.find((day) => day.city)?.city ?? null;

  const isSelectedToday = Boolean(
    selectedDay && dateKey(selectedDay.date) === today,
  );
  const nowModeActive =
    mode === "now" && isSelectedToday && phase === "during";

  const focus = useMemo(() => {
    if (!nowModeActive) return null;
    return nextAgendaItem(agenda, {
      now: new Date(nowMs),
      isToday: true,
    });
  }, [agenda, nowModeActive, nowMs]);

  const focusId = focus?.item.id ?? null;
  const mutedIds = useMemo(() => {
    if (!nowModeActive || !focusId) return new Set<string>();
    const ids = new Set<string>();
    for (const item of agenda) {
      if (item.id === focusId) break;
      ids.add(item.id);
    }
    return ids;
  }, [agenda, focusId, nowModeActive]);

  const dayOtherPending = useMemo(() => {
    if (!selectedDay) return [];
    return places.filter(
      (place) =>
        place.pending &&
        place.dayIds.length > 0 &&
        !place.dayIds.includes(selectedDay.id),
    );
  }, [places, selectedDay]);

  const pendingCount = selectedDay
    ? pending.length + dayOtherPending.length + carryOver.length
    : 0;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNowMs(Date.now()));
    if (!nowModeActive) {
      return () => window.cancelAnimationFrame(frame);
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(id);
    };
  }, [nowModeActive]);

  const selectDay = useCallback(
    (id: string) => {
      setSelectedId(id);
      const nextMode: ScheduleMode =
        mode === "edit" && canEdit
          ? "edit"
          : id !== "all" &&
              phase === "during" &&
              dateKey(days.find((d) => d.id === id)?.date ?? null) === today
            ? mode === "now"
              ? "now"
              : mode
            : mode === "now"
              ? "view"
              : mode;
      const resolved =
        nextMode === "edit" && id === "all" ? ("view" as const) : nextMode;
      if (resolved !== mode) setMode(resolved);
      writeScheduleUrl(id, id === "all" ? "view" : resolved);
      scrolledForDayRef.current = null;
    },
    [canEdit, days, mode, phase, today],
  );

  const setScheduleMode = useCallback(
    (next: ScheduleMode) => {
      if (next === "edit" && !canEdit) return;
      let resolved = next;
      if (
        next === "view" &&
        phase === "during" &&
        selectedDay &&
        dateKey(selectedDay.date) === today
      ) {
        resolved = "now";
      }
      setMode(resolved);
      if (!selectedId || selectedId === "all") return;
      const params = new URLSearchParams();
      params.set("day", selectedId);
      if (resolved === "now" || resolved === "edit") {
        params.set("mode", resolved);
      }
      router.replace(`/schedule?${params.toString()}`, { scroll: false });
    },
    [canEdit, phase, router, selectedDay, selectedId, today],
  );

  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      const day = params.get("day");
      const m = params.get("mode");
      if (day && (day === "all" || days.some((item) => item.id === day))) {
        setSelectedId(day);
      }
      if (m === "edit" && canEdit) setMode("edit");
      else if (m === "now") setMode("now");
      else setMode("view");
      scrolledForDayRef.current = null;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [canEdit, days]);

  const rootRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const skipClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startHeight: number;
    moved: boolean;
  } | null>(null);
  const [snapIndex, setSnapIndex] = useState(DEFAULT_SNAP);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);

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
    if (mapFullscreen) return;
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

  useEffect(() => {
    if (!mapFullscreen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMapFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapFullscreen]);

  useEffect(() => {
    if (!nowModeActive || !selectedDay) return;
    if (scrolledForDayRef.current === selectedDay.id) return;
    const pane = paneRef.current;
    if (!pane) return;
    const nowCard = pane.querySelector<HTMLElement>("[data-now-card]");
    const agendaEl =
      focusId != null
        ? pane.querySelector<HTMLElement>(
            `[data-agenda-id="${CSS.escape(focusId)}"]`,
          )
        : null;
    const el = nowCard ?? agendaEl;
    if (!el) return;
    scrolledForDayRef.current = selectedDay.id;
    const sticky = pane.querySelector<HTMLElement>(
      "[data-schedule-sticky-header]",
    );
    const margin = (sticky?.offsetHeight ?? 56) + 8;
    el.style.scrollMarginTop = `${margin}px`;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      block: "start",
      behavior: reduce ? "auto" : "smooth",
      inline: "nearest",
    });
  }, [focusId, nowModeActive, selectedDay]);

  const editing = mode === "edit" && canEdit && selectedDay != null;
  const editPlaces = (slice?.places ?? []).filter((place) => !place.pending);
  const editTransit = slice?.transit ?? [];

  return (
    <div ref={rootRef} className="flex h-dvh flex-col overflow-hidden">
      <Link
        href="/"
        aria-label={t("nav.backOverview")}
        className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] left-4 z-30 flex min-h-11 items-center gap-1 rounded-full border border-line bg-surface/95 px-4 py-2.5 text-sm font-medium text-ink shadow-[0_4px_16px_rgba(28,25,23,0.10)] backdrop-blur"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M15 18 9 12l6-6" />
        </svg>
        {t("common.overview")}
      </Link>
      <div className="relative z-0 min-h-0 flex-1 isolate overflow-hidden">
        <DayMapLoader
          city={mapCity}
          pins={mapPins}
          className="h-full border-0"
          fullscreen={mapFullscreen}
          onFullscreenChange={setMapFullscreen}
        />
        <Link
          href="/"
          aria-label={t("nav.backOverview")}
          className="absolute left-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-1100 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur"
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
          <p className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] z-1100 max-w-[70%] rounded-full bg-surface/90 px-3 py-2 text-right text-[11px] font-medium text-ink-muted shadow-sm backdrop-blur">
            {t("schedule.savedItinerary", { time: formatCachedAt(cachedAt) })}
          </p>
        ) : null}
        {mapFullscreen ? (
          <button
            type="button"
            onClick={() => setMapFullscreen(false)}
            className="absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] left-1/2 z-1100 -translate-x-1/2 rounded-full bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-md"
          >
            {t("common.showSchedule")}
          </button>
        ) : null}
      </div>

      <section
        className={`relative z-20 flex shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-line bg-surface shadow-[0_-8px_32px_rgba(28,25,23,0.12)] ${
          mapFullscreen ? "pointer-events-none min-h-0" : "min-h-64"
        }`}
        style={{
          height: mapFullscreen ? 0 : sheetHeight,
          maxHeight: mapFullscreen ? 0 : "calc(100% - 2.75rem)",
          transition:
            dragHeight == null
              ? "height 320ms cubic-bezier(0.32, 0.72, 0, 1), max-height 320ms cubic-bezier(0.32, 0.72, 0, 1)"
              : "none",
        }}
        aria-hidden={mapFullscreen}
      >
        <button
          type="button"
          aria-label={expanded ? t("schedule.collapse") : t("schedule.expand")}
          aria-expanded={expanded}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onClick={onHandleClick}
          onKeyDown={onHandleKeyDown}
          className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2 pb-1 active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-ink-muted/35" />
        </button>

        <ScheduleDayTabs
          days={days}
          selectedId={selectedDay?.id ?? "all"}
          onSelect={selectDay}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
          {selectedDay ? (
            <div
              key={selectedDay.id}
              ref={paneRef}
              className="schedule-pane min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]"
            >
              <div
                data-schedule-sticky-header
                className="sticky top-0 z-30 border-b border-line bg-surface px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                      {selectedDay.name}
                    </h2>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden text-[11px] leading-4 text-ink-muted">
                      {formatDay(selectedDay.date, locale) ? (
                        <span className="shrink-0 whitespace-nowrap tabular-nums">
                          {formatDay(selectedDay.date, locale)}
                        </span>
                      ) : null}
                      {selectedDay.city ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap">
                          <span aria-hidden>·</span>
                          <span>{selectedDay.city}</span>
                          <CityKanji
                            city={selectedDay.city}
                            className="text-[11px]"
                          />
                        </span>
                      ) : null}
                      {lodging[0] ? (
                        <span className="inline-flex min-w-0 flex-1 items-center overflow-hidden">
                          <span aria-hidden className="shrink-0">
                            · 🏨{" "}
                          </span>
                          <span className="min-w-0 truncate">
                            {lodging[0].name}
                          </span>
                        </span>
                      ) : null}
                      {pendingCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => setPendingOpen(true)}
                          className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11px] text-ink-muted"
                        >
                          <span aria-hidden>·</span>
                          {t("schedule.pendingCount", { n: pendingCount })} ›
                        </button>
                      ) : null}
                    </p>
                    {lodging.length > 1
                      ? lodging.slice(1).map((stay) => (
                          <StayLocationBadge key={stay.id} stay={stay} />
                        ))
                      : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Link
                      href="/phrases"
                      aria-label={t("phrases.navAria")}
                      className="inline-flex h-10 items-center gap-0.5 px-1.5 text-[12px] font-medium text-ink-muted no-underline"
                    >
                      <span aria-hidden>あ</span>
                      {t("phrases.navShort")}
                    </Link>
                    <EditorLockButton />
                    <button
                      type="button"
                      onClick={() =>
                        editOrUnlock(() =>
                          setScheduleMode(editing ? "view" : "edit"),
                        )
                      }
                      className="inline-flex h-10 items-center px-1.5 text-sm font-medium text-accent"
                    >
                      {editing ? t("schedule.done") : t("schedule.edit")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-3 pt-2">
                {editing ? (
                  <div className="grid gap-3">
                    <AgendaEditTable
                      places={editPlaces}
                      transit={editTransit}
                      dayId={selectedDay.id}
                      dayDate={selectedDay.date}
                    />
                    <AddAgendaForm
                      days={days}
                      defaultDayId={selectedDay.id}
                      dayDate={selectedDay.date}
                    />
                  </div>
                ) : (
                  <>
                    {nowModeActive ? (
                      <NowCard
                        focus={focus}
                        onActivate={() => {
                          if (!focusId) return;
                          const pane = paneRef.current;
                          if (!pane) return;
                          const el = pane.querySelector<HTMLElement>(
                            `[data-agenda-id="${CSS.escape(focusId)}"]`,
                          );
                          if (!el) return;
                          const sticky = pane.querySelector<HTMLElement>(
                            "[data-schedule-sticky-header]",
                          );
                          el.style.scrollMarginTop = `${(sticky?.offsetHeight ?? 56) + 8}px`;
                          const reduce = window.matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches;
                          el.scrollIntoView({
                            block: "start",
                            behavior: reduce ? "auto" : "smooth",
                            inline: "nearest",
                          });
                        }}
                      />
                    ) : null}
                    <DayAgendaBoard
                      agenda={agenda}
                      pending={pending}
                      dayId={selectedDay.id}
                      dayDate={selectedDay.date}
                      showPending={false}
                      highlightId={nowModeActive ? focusId : null}
                      mutedIds={nowModeActive ? mutedIds : undefined}
                    />
                  </>
                )}
              </div>
            </div>
          ) : (
            <AllDaysPanel days={days} places={places} onSelectDay={selectDay} />
          )}
        </div>
      </section>

      {selectedDay && !editing ? (
        <DayQuickFab
          dayId={selectedDay.id}
          dayDate={selectedDay.date}
          days={days}
          people={people}
        />
      ) : null}

      {selectedDay ? (
        <Modal
          open={pendingOpen}
          onClose={() => setPendingOpen(false)}
          title={t("schedule.pendingTitle")}
        >
          <div className="grid gap-4 px-1 pb-4">
            <CarryOverBanner
              places={carryOver}
              dayId={selectedDay.id}
              title={t("agenda.carryOverPast")}
            />
            <CarryOverBanner
              places={dayOtherPending}
              dayId={selectedDay.id}
              title={t("agenda.carryOverOther")}
            />
            <PendingPanel
              pending={pending}
              dayId={selectedDay.id}
              dayDate={selectedDay.date}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function NowCard({
  focus,
  onActivate,
}: {
  focus: { item: AgendaItem; status: "now" | "next" } | null;
  onActivate?: () => void;
}) {
  const { t, locale } = useT();

  if (!focus) {
    return (
      <section
        data-now-card
        className="mb-2 flex h-11 items-center rounded-lg border border-line border-l-[3px] border-l-line bg-surface px-3"
      >
        <p className="truncate text-[13px] font-medium leading-4 text-ink">
          {t("schedule.dayDone")}
        </p>
      </section>
    );
  }

  const { item, status } = focus;
  const chipLabel =
    item.kind === "place"
      ? labelType(locale, item.chip)
      : labelMode(locale, item.chip);
  const line = [
    status === "now" ? t("schedule.now") : t("schedule.upNext"),
    formatTime(item.start) ?? t("common.anytime"),
    item.name,
    chipLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      data-now-card
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      className="mb-2 flex h-12 cursor-pointer items-center gap-1 rounded-lg border border-accent/25 border-l-[3px] border-l-accent bg-accent/5 py-1 pl-3 pr-1"
    >
      <p className="min-w-0 flex-1 truncate text-[13px] font-medium leading-4 text-ink">
        <span className="tabular-nums">{line}</span>
      </p>
      {item.kind === "place" ? (
        <div
          className="flex shrink-0 items-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MapsPinLink
            name={item.name}
            lat={item.lat}
            lng={item.lng}
            mapsUrl={item.mapsUrl}
          />
          <DirectionsLink
            name={item.name}
            lat={item.lat}
            lng={item.lng}
            mapsUrl={item.mapsUrl}
          />
        </div>
      ) : null}
    </section>
  );
}

function StayLocationBadge({ stay }: { stay: Stay }) {
  const { t } = useT();
  const hiddenIds = useHiddenMapPinIds();
  const hidden = hiddenIds.has(stay.id);
  const label = hidden
    ? t("stay.showOnMap", { name: stay.name })
    : t("stay.hideFromMap", { name: stay.name });

  return (
    <div
      title={stay.address || stay.name}
      className={`mt-1.5 flex max-w-full items-center gap-1.5 text-xs ${
        hidden ? "text-ink-muted" : "text-ink-muted"
      }`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10h18M5 10V8l7-4 7 4v2M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
      <span className="min-w-0 truncate leading-5">{stay.name}</span>
      <button
        type="button"
        aria-label={label}
        aria-pressed={hidden}
        title={hidden ? t("stay.show") : t("stay.hide")}
        onClick={() => toggleHiddenMapPin(stay.id)}
        className="-my-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {hidden ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.1A9 9 0 0 1 12 5c5 0 8.5 5 8.5 5a15 15 0 0 1-2.2 2.8" />
              <path d="M6.1 6.1 3.5 10S7 15 12 15a8 8 0 0 0 3.2-.6" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </>
          )}
        </svg>
      </button>
    </div>
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
  const { t, locale } = useT();
  const scrollerRef = useSuppressClickAfterScroll();
  const dated = days.filter((day) => day.date);
  const span = formatTripSpan(
    dated[0]?.date ?? null,
    dated[dated.length - 1]?.date ?? null,
    locale,
  );

  return (
    <div
      ref={scrollerRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("schedule.allDays")}
        </h2>
        <p className="mt-0.5 text-xs text-ink-muted">{span}</p>
      </div>
      <ul className="space-y-4 px-4 pb-3">
        {days.map((day, index) => {
          const items = places.filter(
            (place) => place.dayIds.includes(day.id) && !place.pending,
          );
          return (
            <li key={day.id}>
              <AllDayJumpButton
                day={day}
                index={index}
                onSelectDay={onSelectDay}
              />
              {items.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">
                  {t("schedule.noPlaces")}
                </p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {items.map((place) => (
                    <li key={place.id} className="text-sm text-ink-muted">
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
  const { locale } = useT();
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
        <span className="text-ink-muted">D{index + 1}</span> {day.name}
      </span>
      <span className="shrink-0 text-xs text-ink-muted">
        {formatDay(day.date, locale)}
      </span>
    </button>
  );
}
