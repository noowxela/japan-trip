"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { updatePlaceNotes } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import {
  ActionSheet,
  ActionSheetItem,
  ChipRow,
  CompactRow,
  CompactRowList,
  compactFieldClass,
  compactLabelClass,
  compactTextareaClass,
  RowMoreButton,
} from "@/components/compact";
import { useCanEdit } from "@/components/edit-session";
import { EmptyState } from "@/components/empty-state";
import { HankoStamp } from "@/components/hanko-stamp";
import { useT } from "@/components/i18n-provider";
import { MapsPinLink } from "@/components/maps-pin-link";
import { useOutbox } from "@/components/outbox-provider";
import { useToast } from "@/components/toast-provider";
import { coordsOfPlace } from "@/lib/geocode";
import { dateKey, tokyoToday } from "@/lib/format";
import { labelType } from "@/lib/i18n/dictionaries";
import type { Place, TripDay } from "@/lib/types";

const filters = ["All", "Pending", "Unvisited", "Visited"] as const;
const filterKey = {
  All: "places.filterAll",
  Pending: "places.filterPending",
  Unvisited: "places.filterUnvisited",
  Visited: "places.filterVisited",
} as const;
const types = ["All types", "Sight", "Food", "Shop", "Cafe", "Other"] as const;

function scheduleDayHref(id: string, date: string | null) {
  const base = `/schedule?day=${encodeURIComponent(id)}`;
  return dateKey(date) === tokyoToday() ? `${base}&mode=now` : base;
}

export function PlacesList({
  places,
  days,
}: {
  places: Place[];
  days: TripDay[];
}) {
  const { t, locale } = useT();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All");
  const [type, setType] = useState<(typeof types)[number]>("All types");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const dayById = useMemo(() => new Map(days.map((day) => [day.id, day])), [days]);
  const canEdit = useCanEdit();
  const { markVisited, visitedOverlay } = useOutbox();
  const { toast } = useToast();
  const notify = useActionToast();
  const [busy, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return places.filter((place) => {
      if (status === "Pending" && !place.pending) return false;
      if (status === "Visited" && !place.visited) return false;
      if (status === "Unvisited" && (place.visited || place.pending)) return false;
      if (type !== "All types" && place.type !== type) return false;
      if (query.trim()) {
        const haystack = `${place.name} ${place.notes}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [places, query, status, type]);

  const menuPlace = places.find((place) => place.id === menuId) ?? null;
  const menuVisited = menuPlace
    ? (visitedOverlay[menuPlace.id] ?? menuPlace.visited)
    : false;
  const menuCoords = menuPlace ? coordsOfPlace(menuPlace) : null;

  if (places.length === 0) {
    return (
      <EmptyState title={t("schedule.noPlaces")}>
        {t("places.emptyBody")}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-2.5">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("form.searchPlaces")}
        className={compactFieldClass}
      />
      <ChipRow
        label={t("places.statusFilter")}
        value={status}
        onChange={setStatus}
        options={filters.map((option) => ({
          value: option,
          label: t(filterKey[option]),
        }))}
      />
      <ChipRow
        label={t("places.typeFilter")}
        value={type}
        onChange={setType}
        options={types.map((option) => ({
          value: option,
          label:
            option === "All types"
              ? t("places.allTypes")
              : labelType(locale, option) ?? option,
        }))}
      />

      {filtered.length === 0 ? (
        <EmptyState title={t("places.noMatches")}>{t("places.tryFilter")}</EmptyState>
      ) : (
        <CompactRowList>
          {filtered.map((place) => {
            const visited = visitedOverlay[place.id] ?? place.visited;
            const typeLabel = labelType(locale, place.type);
            const dayMeta =
              place.dayIds.length > 0
                ? place.dayIds
                    .map((id) => dayById.get(id)?.name)
                    .filter(Boolean)
                    .join(", ")
                : t("places.unscheduled");
            return (
              <li
                key={place.id}
                className={place.pending ? "bg-maybe-soft/60" : undefined}
              >
                <CompactRow
                  title={place.name}
                  meta={typeLabel}
                  secondary={
                    place.pending
                      ? `${t("agenda.maybe")} · ${dayMeta}`
                      : dayMeta
                  }
                  trailing={
                    <>
                      {visited ? (
                        <HankoStamp variant="ok" size="sm" className="mr-0.5">
                          {t("theme.stampVisited")}
                        </HankoStamp>
                      ) : null}
                      <RowMoreButton
                        label={t("agenda.actionsFor", { name: place.name })}
                        onClick={() => {
                          setNotesOpen(false);
                          setMenuId(place.id);
                        }}
                      />
                    </>
                  }
                />
              </li>
            );
          })}
        </CompactRowList>
      )}

      <ActionSheet
        open={menuPlace != null}
        onClose={() => {
          setMenuId(null);
          setNotesOpen(false);
        }}
        title={menuPlace?.name ?? t("common.actions")}
      >
        {menuPlace ? (
          <>
            {canEdit ? (
              <ActionSheetItem
                disabled={busy}
                onClick={() => {
                  const next = !menuVisited;
                  setMenuId(null);
                  startTransition(async () => {
                    await markVisited(menuPlace.id, next);
                    toast(
                      next
                        ? t("action.markedVisited")
                        : t("action.markedUnvisited"),
                      {
                        actionLabel: t("common.undo"),
                        onAction: () => {
                          void markVisited(menuPlace.id, !next);
                        },
                      },
                    );
                  });
                }}
              >
                {menuVisited
                  ? t("agenda.markUnvisited")
                  : t("agenda.markVisited")}
              </ActionSheetItem>
            ) : null}
            {menuCoords || menuPlace.mapsUrl ? (
              <div className="px-1">
                <MapsPinLink
                  name={menuPlace.name}
                  lat={menuCoords?.lat}
                  lng={menuCoords?.lng}
                  mapsUrl={menuPlace.mapsUrl}
                  variant="text"
                />
              </div>
            ) : null}
            {canEdit ? (
              notesOpen ? (
                <form
                  className="grid gap-2 rounded-xl border border-line bg-surface p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    startTransition(async () => {
                      await notify(await updatePlaceNotes(formData));
                      setMenuId(null);
                      setNotesOpen(false);
                    });
                  }}
                >
                  <input type="hidden" name="id" value={menuPlace.id} />
                  <label className={`block ${compactLabelClass}`}>
                    {t("form.notes")}
                    <textarea
                      name="notes"
                      defaultValue={menuPlace.notes}
                      rows={3}
                      autoFocus
                      className={`mt-1 ${compactTextareaClass}`}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="notebook-btn h-9 rounded-lg bg-accent text-[13px] font-medium text-white disabled:opacity-60"
                  >
                    {busy ? t("common.saving") : t("notes.save")}
                  </button>
                </form>
              ) : (
                <ActionSheetItem onClick={() => setNotesOpen(true)}>
                  {menuPlace.notes?.trim()
                    ? t("places.editNotes")
                    : t("notes.add")}
                </ActionSheetItem>
              )
            ) : menuPlace.notes?.trim() ? (
              <p className="whitespace-pre-wrap px-1 text-[13px] text-ink-muted">
                {menuPlace.notes}
              </p>
            ) : null}
            {menuPlace.dayIds[0] ? (
              <Link
                href={scheduleDayHref(
                  menuPlace.dayIds[0],
                  dayById.get(menuPlace.dayIds[0])?.date ?? null,
                )}
                className="notebook-btn inline-flex min-h-11 w-full items-center justify-start rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink no-underline"
                onClick={() => setMenuId(null)}
              >
                {t("common.openSchedule")}
              </Link>
            ) : null}
            <ActionSheetItem onClick={() => setMenuId(null)}>
              {t("common.cancel")}
            </ActionSheetItem>
          </>
        ) : null}
      </ActionSheet>
    </div>
  );
}
