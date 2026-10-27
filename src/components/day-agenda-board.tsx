"use client";

import { useState, useTransition } from "react";
import {
  confirmPendingPlace,
  movePendingToDay,
  parkPlaceAsPending,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useCanEdit } from "@/components/edit-session";
import {
  useHiddenMapPinIds,
} from "@/components/hide-map-pin-button";
import { DirectionsLink } from "@/components/directions-link";
import { HankoStamp } from "@/components/hanko-stamp";
import { useT } from "@/components/i18n-provider";
import { MapsPinLink } from "@/components/maps-pin-link";
import { Modal } from "@/components/modal";
import { useOutbox } from "@/components/outbox-provider";
import { useToast } from "@/components/toast-provider";
import {
  formatGapMinutes,
  formatTime,
  minutesBetweenStarts,
  startBefore,
} from "@/lib/format";
import { walkLabelBetween } from "@/lib/geo";
import { toggleHiddenMapPin } from "@/lib/hidden-map-pins";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import { sightNumbersFromAgenda } from "@/lib/schedule-pins";
import type { AgendaItem, Place } from "@/lib/types";

type DragPayload = { id: string; from: "pending" | "agenda" };

const TIMELINE_GRID =
  "grid grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-start gap-x-1.5";
const MIN_GAP_MINUTES = 15;

function readPayload(event: React.DragEvent) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain")) as DragPayload;
  } catch {
    return null;
  }
}

function isFoodChip(chip: string | null) {
  return chip === "Food" || chip === "Cafe";
}

function TimelineRail({
  children,
  start = false,
  end = false,
  align = "full",
}: {
  children?: React.ReactNode;
  /** First agenda row: line begins at marker centre. */
  start?: boolean;
  /** Last agenda row: line ends at marker centre. */
  end?: boolean;
  /** place/transit offset the marker; full = gap/drop rows (no offset). */
  align?: "place" | "transit" | "full";
}) {
  // Compact rows (~44px): centre marker on the row.
  const markerMt =
    align === "place" || align === "transit" ? "mt-2.5" : undefined;
  let lineClass =
    "pointer-events-none absolute left-1/2 w-px -translate-x-1/2 bg-line";
  if (align === "full") {
    lineClass += " inset-y-0";
  } else if (start && end) {
    lineClass += " hidden";
  } else if (start) {
    lineClass += " top-[22px] bottom-0";
  } else if (end) {
    lineClass += " top-0 h-[22px]";
  } else {
    lineClass += " inset-y-0";
  }

  // Gap/drop rails (align=full) must not force min-height — gap rows are capped at 18px.
  const minH = align === "full" ? "min-h-0" : "min-h-5";
  return (
    <span className={`relative flex h-full ${minH} w-5 justify-center self-stretch`}>
      <span aria-hidden className={lineClass} />
      {children ? (
        <span className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center ${markerMt ?? ""}`}>
          {children}
        </span>
      ) : null}
    </span>
  );
}

function TimelineMark({
  number,
  food,
  visited,
  transit,
  current = false,
}: {
  number?: number;
  food: boolean;
  visited: boolean;
  transit?: boolean;
  current?: boolean;
}) {
  const numbered = current ? "bg-accent" : "bg-ink";
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {visited ? (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ok text-white">
          <svg
            viewBox="0 0 24 24"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L19 7" />
          </svg>
        </span>
      ) : transit ? (
        <span className="h-2 w-2 rounded-full border-2 border-transit bg-transit-soft" />
      ) : number != null ? (
        <span
          className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ${numbered}`}
        >
          {number}
        </span>
      ) : food ? (
        <span className="h-2 w-2 rounded-full bg-maybe ring-2 ring-surface" />
      ) : (
        <span className={`h-2 w-2 rounded-full ring-2 ring-surface ${numbered}`} />
      )}
    </span>
  );
}

function PendingCard({
  place,
  dayId,
  dayDate,
  onAddEnd,
  onMoveHere,
  showMoveHere,
  canEdit,
}: {
  place: Place;
  dayId: string;
  dayDate: string | null;
  onAddEnd: () => void;
  onMoveHere?: () => void;
  showMoveHere?: boolean;
  canEdit: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();
  const { t, locale } = useT();

  function scheduleBefore(before: AgendaItem | null) {
    const formData = new FormData();
    formData.set("id", place.id);
    formData.set("dayId", dayId);
    if (before?.start) {
      formData.set("start", startBefore(before.start, dayDate));
    } else {
      formData.set("slot", "end");
    }
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  return (
    <li
      draggable={canEdit}
      onDragStart={(event) => {
        if (!canEdit) return;
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ id: place.id, from: "pending" }),
        );
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-xl border border-maybe/30 bg-maybe-soft p-2.5 ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-[10px] font-medium text-maybe">
        {labelType(locale, place.type) ?? t("agenda.maybe")}
      </p>
      <p className="text-sm font-medium leading-snug break-words">{place.name}</p>
      {canEdit ? (
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddEnd}
          className="rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-white"
        >
          {t("agenda.addToAgenda")}
        </button>
        {showMoveHere && onMoveHere ? (
          <button
            type="button"
            onClick={onMoveHere}
            className="rounded-full bg-canvas px-3 py-1 text-[11px] font-medium text-ink"
          >
            {t("agenda.moveHere")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => scheduleBefore(null)}
          className="rounded-full bg-canvas px-3 py-1 text-[11px] font-medium text-ink"
        >
          {t("agenda.schedule")}
        </button>
      </div>
      ) : null}
    </li>
  );
}

export function PendingPanel({
  pending,
  dayId,
  dayDate,
  mobileSheet = false,
}: {
  pending: Place[];
  dayId: string;
  dayDate: string | null;
  mobileSheet?: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const [over, setOver] = useState(false);
  const notify = useActionToast();
  const canEdit = useCanEdit();
  const { t } = useT();

  function dropOnPending(event: React.DragEvent) {
    event.preventDefault();
    setOver(false);
    const payload = readPayload(event);
    if (!payload || payload.from !== "agenda") return;
    const formData = new FormData();
    formData.set("id", payload.id);
    formData.set("dayId", dayId);
    startTransition(async () => notify(await parkPlaceAsPending(formData)));
  }

  function addToAgenda(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    formData.set("slot", "end");
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  const shellClass = mobileSheet
    ? "rounded-2xl border border-line bg-surface p-4 lg:hidden"
    : "hidden rounded-2xl border border-line bg-surface p-3 lg:sticky lg:top-20 lg:block";

  return (
    <aside
      onDragOver={(event) => {
        if (!canEdit) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={canEdit ? dropOnPending : undefined}
      className={`${shellClass} ${over ? "border-maybe" : "border-line"} ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-sm font-medium text-ink-muted">
        {t("agenda.pending")}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        {over ? t("agenda.dropToPark") : t("agenda.parkHere")}
      </p>
      {pending.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-ink-muted">
          {t("agenda.nonePending")}
        </p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto lg:max-h-none">
          {pending.map((place) => (
            <PendingCard
              key={place.id}
              place={place}
              dayId={dayId}
              dayDate={dayDate}
              onAddEnd={() => addToAgenda(place.id)}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

export function CarryOverBanner({
  places,
  dayId,
  title,
}: {
  places: Place[];
  dayId: string;
  title: string;
}) {
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();
  const canEdit = useCanEdit();
  const { t, locale } = useT();

  if (places.length === 0) return null;

  function moveHere(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    startTransition(async () => notify(await movePendingToDay(formData)));
  }

  function addToAgenda(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    formData.set("slot", "end");
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  return (
    <section
      className={`rounded-2xl border border-maybe/30 bg-maybe-soft p-4 ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-sm font-medium text-maybe">{title}</p>
      <ul className="mt-3 space-y-2">
        {places.map((place) => (
          <li
            key={place.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium break-words">{place.name}</p>
              <p className="text-xs text-ink-muted">
                {labelType(locale, place.type) ?? t("type.Other")}
              </p>
            </div>
            {canEdit ? (
            <div className="flex flex-wrap gap-2">
              {place.pending ? (
                <button
                  type="button"
                  onClick={() => addToAgenda(place.id)}
                  className="inline-flex min-h-11 items-center rounded-full bg-accent px-3 text-xs font-medium text-white"
                >
                  {t("agenda.addToAgenda")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => moveHere(place.id)}
                  className="inline-flex min-h-11 items-center rounded-full bg-ink px-3 text-xs font-medium text-surface"
                >
                  {t("agenda.moveHere")}
                </button>
              )}
            </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DayAgendaBoard({
  agenda,
  pending,
  dayId,
  dayDate,
  showPending = true,
  highlightId = null,
  mutedIds,
}: {
  agenda: AgendaItem[];
  pending: Place[];
  dayId: string;
  dayDate: string | null;
  showPending?: boolean;
  highlightId?: string | null;
  mutedIds?: Set<string>;
}) {
  const [busy, startTransition] = useTransition();
  const [over, setOver] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [popId, setPopId] = useState<string | null>(null);
  const [showVisited, setShowVisited] = useState(false);
  const notify = useActionToast();
  const { toast } = useToast();
  const canEdit = useCanEdit();
  const hiddenIds = useHiddenMapPinIds();
  const { t, locale } = useT();
  const { markVisited, visitedOverlay } = useOutbox();
  const isVisited = (item: AgendaItem) => {
    if (item.kind !== "place") return false;
    return visitedOverlay[item.id] ?? Boolean(item.visited);
  };
  const visitedCount = agenda.filter((item) => isVisited(item)).length;
  const sightNumbers = sightNumbersFromAgenda(agenda);

  function dropOnAgenda(before: AgendaItem | null) {
    return (event: React.DragEvent) => {
      event.preventDefault();
      setOver(null);
      const payload = readPayload(event);
      if (!payload || payload.from !== "pending") return;
      const formData = new FormData();
      formData.set("id", payload.id);
      formData.set("dayId", dayId);
      if (before?.start) {
        formData.set("start", startBefore(before.start, dayDate));
      } else {
        formData.set("slot", "end");
      }
      startTransition(async () => notify(await confirmPendingPlace(formData)));
    };
  }

  function parkPlace(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    setMenuId(null);
    startTransition(async () => notify(await parkPlaceAsPending(formData)));
  }

  function setVisited(id: string, visited: boolean) {
    setMenuId(null);
    if (visited) {
      setPopId(id);
      window.setTimeout(() => setPopId((current) => (current === id ? null : current)), 450);
    }
    startTransition(async () => {
      await markVisited(id, visited);
      toast(
        visited ? t("action.markedVisited") : t("action.markedUnvisited"),
        {
          actionLabel: t("common.undo"),
          onAction: () => {
            void markVisited(id, !visited);
          },
        },
      );
    });
  }

  const menuItem = agenda.find(
    (item) => item.kind === "place" && item.id === menuId,
  );
  const menuHasCoords =
    menuItem != null && menuItem.lat != null && menuItem.lng != null;
  const menuHidden = menuItem != null && hiddenIds.has(menuItem.id);

  return (
    <div
      className={`grid gap-2 ${showPending ? "lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start" : "max-w-2xl"} ${busy ? "opacity-70" : ""}`}
    >
      <div>
        {visitedCount > 0 ? (
          <button
            type="button"
            aria-expanded={showVisited}
            onClick={() => setShowVisited((value) => !value)}
            className="mb-1.5 inline-flex min-h-9 items-center rounded-lg px-1 text-xs text-ink-muted"
          >
            {t("agenda.doneExpand", { n: visitedCount })}
          </button>
        ) : null}
        {agenda.length === 0 ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setOver("agenda-empty");
            }}
            onDragLeave={() => setOver(null)}
            onDrop={dropOnAgenda(null)}
            className={`rounded-2xl border border-dashed px-4 py-8 text-sm ${
              over === "agenda-empty"
                ? "border-accent bg-accent/5 text-accent"
                : "border-line text-ink-muted"
            }`}
          >
            {showPending
              ? t("agenda.emptyPending")
              : t("agenda.emptySchedule")}
          </div>
        ) : (
          <ol className="relative">
            {agenda.map((item, index) => {
              const food = item.kind === "place" && isFoodChip(item.chip);
              const visited = isVisited(item);
              if (visited && !showVisited && item.id !== highlightId) {
                return null;
              }
              const transit = item.kind === "transit";
              const sightNo =
                item.kind === "place" ? sightNumbers.get(item.id) : undefined;
              const timeLabel = formatTime(item.start) ?? "—";
              const dropId = `before-${item.id}`;
              const previous = index > 0 ? agenda[index - 1] : null;
              const gapMins =
                previous && item.start
                  ? minutesBetweenStarts(previous.start, item.start)
                  : null;
              const gap =
                gapMins != null && gapMins >= MIN_GAP_MINUTES
                  ? formatGapMinutes(gapMins, locale)
                  : null;
              const walkRaw = previous
                ? walkLabelBetween(previous, item, locale)
                : null;
              const walk = walkRaw?.replace(/^~/, "") ?? null;
              const between = [gap, walk].filter(Boolean).join(" · ");
              const pinHidden =
                item.kind === "place" &&
                item.lat != null &&
                item.lng != null &&
                hiddenIds.has(item.id);
              const typeLabel =
                item.kind === "place" ? labelType(locale, item.chip) : null;
              const modeLabel =
                item.kind === "transit"
                  ? labelMode(locale, item.chip) ?? t("mode.Transit")
                  : null;
              const primaryMeta = [typeLabel].filter(Boolean);
              const secondaryBits = [
                item.kind === "place" && item.detail ? item.detail : null,
                pinHidden ? t("agenda.hiddenOnMap") : null,
              ].filter(Boolean);
              const visibleItems = agenda.filter(
                (row) =>
                  !isVisited(row) || showVisited || row.id === highlightId,
              );
              const visibleIndex = visibleItems.findIndex(
                (row) => row.id === item.id,
              );
              const isFirst = visibleIndex === 0;
              const isLast = visibleIndex === visibleItems.length - 1;
              const isFocus = highlightId != null && item.id === highlightId;
              const isMuted = Boolean(mutedIds?.has(item.id));
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  data-agenda-id={item.id}
                  className={`relative ${isMuted ? "opacity-55" : ""}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOver(dropId);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={dropOnAgenda(item)}
                >
                  {between ? (
                    <div className="grid h-[18px] grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-center gap-x-1.5">
                      <span aria-hidden />
                      <TimelineRail />
                      <p className="truncate text-[11px] leading-[14px] text-ink-muted">
                        · {between} ·
                      </p>
                    </div>
                  ) : null}
                  {over === dropId ? (
                    <div className={TIMELINE_GRID}>
                      <span aria-hidden />
                      <TimelineRail />
                      <div className="relative py-1">
                        <div className="h-0.5 rounded-full bg-accent" />
                        <p className="mt-0.5 text-[10px] font-medium text-accent">
                          {t("agenda.dropBefore")}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  <div
                    className={`${TIMELINE_GRID} border-b border-line/70 last:border-b-0 ${
                      isFocus ? "bg-accent/5" : ""
                    }`}
                  >
                    <p className="w-10 shrink-0 self-center text-right text-[11px] font-semibold tabular-nums leading-4 text-ink">
                      {timeLabel}
                    </p>
                    <TimelineRail
                      start={isFirst}
                      end={isLast}
                      align={transit ? "transit" : "place"}
                    >
                      <span
                        className={
                          isFocus
                            ? "rounded-full ring-2 ring-accent ring-offset-1 ring-offset-canvas"
                            : undefined
                        }
                      >
                        <TimelineMark
                          number={sightNo}
                          food={food}
                          visited={visited}
                          transit={transit}
                          current={isFocus}
                        />
                      </span>
                    </TimelineRail>
                    {transit ? (
                      <div
                        className={`flex min-h-11 min-w-0 items-center gap-1.5 py-1.5 pr-1 ${
                          isFocus ? "border-l-2 border-accent pl-2 -ml-0.5" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] leading-4 text-ink">
                            <span className="mr-1.5 inline-block rounded bg-transit-soft px-1 py-px text-[10px] font-medium text-transit align-middle">
                              {modeLabel}
                            </span>
                            <span className="font-medium">{item.name}</span>
                            {item.detail ? (
                              <span className="text-ink-muted">
                                {" "}
                                · {item.detail}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div
                        draggable={canEdit && !visited}
                        onDragStart={(event) => {
                          if (visited) return;
                          event.dataTransfer.setData(
                            "text/plain",
                            JSON.stringify({ id: item.id, from: "agenda" }),
                          );
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        className={`relative flex min-h-11 min-w-0 items-center gap-1 py-1.5 pr-9 ${
                          isFocus ? "border-l-2 border-accent pl-2 -ml-0.5" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex min-w-0 items-center gap-1.5 truncate text-[13px] leading-4">
                            {visited ? (
                              <HankoStamp
                                variant="ok"
                                size="sm"
                                pop={popId === item.id}
                                className="shrink-0"
                              >
                                {t("theme.stampVisited")}
                              </HankoStamp>
                            ) : null}
                            <span
                              className={`truncate font-medium ${
                                visited
                                  ? "text-ink-muted line-through decoration-line"
                                  : "text-ink"
                              }`}
                            >
                              {item.name}
                            </span>
                            {primaryMeta.length > 0 ? (
                              <span className="truncate text-ink-muted">
                                · {primaryMeta.join(" · ")}
                              </span>
                            ) : null}
                          </p>
                          {secondaryBits.length > 0 ? (
                            <p className="mt-0.5 truncate text-[11px] leading-3 text-ink-muted">
                              {secondaryBits.join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          aria-label={t("agenda.actionsFor", {
                            name: item.name,
                          })}
                          draggable={false}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId(item.id);
                          }}
                          className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                            <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="18" cy="12" r="1.5" fill="currentColor" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            <li
              onDragOver={(event) => {
                event.preventDefault();
                setOver("agenda-end");
              }}
              onDragLeave={() => setOver(null)}
              onDrop={dropOnAgenda(null)}
              className={`${TIMELINE_GRID} ${
                over === "agenda-end" ? "" : "pointer-events-auto"
              }`}
            >
              <span aria-hidden />
              <span aria-hidden className="w-5" />
              <div
                className={`h-6 rounded-lg border border-dashed transition-colors ${
                  over === "agenda-end"
                    ? "border-accent bg-accent/10"
                    : "border-transparent"
                }`}
              />
            </li>
          </ol>
        )}
      </div>
      {showPending ? (
        <>
          <PendingPanel
            pending={pending}
            dayId={dayId}
            dayDate={dayDate}
          />
          <PendingPanel
            pending={pending}
            dayId={dayId}
            dayDate={dayDate}
            mobileSheet
          />
        </>
      ) : null}
      <Modal
        open={menuItem != null}
        onClose={() => setMenuId(null)}
        title={menuItem?.name ?? t("common.actions")}
      >
        {menuItem ? (
          <div className="grid gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
            {canEdit ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setVisited(menuItem.id, !isVisited(menuItem))
                }
                className="notebook-btn min-h-11 w-full bg-ok px-4 py-3 text-left text-sm font-medium text-white disabled:opacity-60"
              >
                {isVisited(menuItem)
                  ? t("agenda.markUnvisited")
                  : t("agenda.markVisited")}
              </button>
            ) : null}
            {canEdit && !isVisited(menuItem) ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => parkPlace(menuItem.id)}
                className="notebook-btn min-h-11 w-full border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-maybe disabled:opacity-60"
              >
                {t("agenda.park")}
              </button>
            ) : null}
            {menuHasCoords ? (
              <>
                <div className="flex gap-2">
                  <MapsPinLink
                    name={menuItem.name}
                    lat={menuItem.lat}
                    lng={menuItem.lng}
                    mapsUrl={menuItem.mapsUrl}
                    variant="text"
                  />
                  <DirectionsLink
                    name={menuItem.name}
                    lat={menuItem.lat}
                    lng={menuItem.lng}
                    mapsUrl={menuItem.mapsUrl}
                    variant="text"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleHiddenMapPin(menuItem.id);
                    setMenuId(null);
                  }}
                  className="notebook-btn min-h-11 w-full border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink"
                >
                  {menuHidden ? t("agenda.showOnMap") : t("agenda.hideFromMap")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setMenuId(null)}
              className="notebook-btn min-h-11 w-full px-4 py-3 text-center text-sm font-medium text-ink-muted"
            >
              {t("common.cancel")}
            </button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
