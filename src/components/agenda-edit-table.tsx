"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deletePlace,
  deleteTransit,
  moveAgendaItemsToDay,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { AgendaItemEditSheet } from "@/components/agenda-item-edit-sheet";
import { useT } from "@/components/i18n-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import { categoryEmoji } from "@/lib/category-icon";
import { dateKey, formatDay, formatTime } from "@/lib/format";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import { buildAgenda } from "@/lib/trip-core";
import type { AgendaItem, Place, Transit, TripDay } from "@/lib/types";

export function AgendaEditTable({
  places,
  transit,
  dayId,
  dayDate,
  days,
  dayCity = null,
}: {
  places: Place[];
  transit: Transit[];
  dayId: string;
  dayDate: string | null;
  days: TripDay[];
  dayCity?: string | null;
}) {
  const { t, locale } = useT();
  const notify = useActionToast();
  const trashWithUndo = useTrashUndo();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [targetDayId, setTargetDayId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const agenda = useMemo(
    () =>
      buildAgenda(
        places.filter((place) => !place.pending),
        transit,
      ),
    [places, transit],
  );

  const otherDays = useMemo(
    () => days.filter((day) => day.id !== dayId),
    [days, dayId],
  );

  const editItem = agenda.find((item) => item.id === editId) ?? null;
  const selectedCount = selected.size;
  const allSelected = agenda.length > 0 && selectedCount === agenda.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (agenda.length > 0 && prev.size === agenda.length) return new Set();
      return new Set(agenda.map((item) => item.id));
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function moveSelected() {
    if (!targetDayId || selectedCount === 0) return;
    const items = agenda
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        start: item.start,
      }));
    if (items.length === 0) return;
    const formData = new FormData();
    formData.set("targetDayId", targetDayId);
    formData.set("items", JSON.stringify(items));
    startTransition(async () => {
      const result = await moveAgendaItemsToDay(formData);
      await notify(result);
      if (result.ok) {
        clearSelection();
        setTargetDayId("");
      }
    });
  }

  async function removeItem(item: AgendaItem) {
    const formData = new FormData();
    formData.set("id", item.id);
    if (item.kind === "transit") {
      await trashWithUndo(await deleteTransit(formData), item.id, "transit");
    } else {
      await trashWithUndo(await deletePlace(formData), item.id, "place");
    }
    setSelected((prev) => {
      if (!prev.has(item.id)) return prev;
      const next = new Set(prev);
      next.delete(item.id);
      return next;
    });
  }

  if (agenda.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
        {t("agenda.noStopsEdit")}
      </p>
    );
  }

  return (
    <div className={`grid gap-2 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="text-[12px] text-ink-muted">{t("schedule.editHint")}</p>
        <button
          type="button"
          onClick={toggleAll}
          className="inline-flex min-h-9 items-center rounded-lg px-2 text-[12px] font-medium text-accent"
        >
          {allSelected ? t("schedule.clearSelection") : t("schedule.selectAll")}
        </button>
      </div>

      <ol className="overflow-hidden rounded-2xl border border-line bg-surface">
        {agenda.map((item) => {
          const checked = selected.has(item.id);
          const timeLabel = formatTime(item.start) ?? "—";
          const kindLabel =
            item.kind === "place"
              ? labelType(locale, item.chip)
              : labelMode(locale, item.chip) ?? t("mode.Transit");
          const emoji = categoryEmoji(item.kind, item.chip) ?? (item.kind === "transit" ? "🚆" : "📍");
          return (
            <li
              key={`${item.kind}-${item.id}`}
              className={`border-b border-line/70 last:border-b-0 ${
                checked ? "bg-accent/5" : ""
              }`}
            >
              <div className="grid grid-cols-[2.25rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-1.5 px-2 py-2.5">
                <label className="flex min-h-11 min-w-11 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.id)}
                    aria-label={item.name}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="text-left text-[13px] tabular-nums text-ink-muted"
                >
                  {timeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="min-w-0 text-left"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span aria-hidden className="shrink-0 text-[14px]">
                      {emoji}
                    </span>
                    <span className="min-w-0 truncate text-[14px] font-medium text-ink">
                      {item.name}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                    {[kindLabel, item.detail].filter(Boolean).join(" · ")}
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setEditId(item.id)}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[12px] font-medium text-accent"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      startTransition(async () => {
                        await removeItem(item);
                      });
                    }}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-[12px] text-ink-muted"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {selectedCount > 0 ? (
        <div className="sticky bottom-20 z-20 rounded-2xl border border-line bg-surface/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/90">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-ink">
              {t("schedule.selectedCount", { n: selectedCount })}
            </p>
            <button
              type="button"
              onClick={clearSelection}
              className="text-[12px] text-ink-muted"
            >
              {t("schedule.clearSelection")}
            </button>
          </div>
          <label className="mt-2 grid gap-1">
            <span className="text-[11px] font-medium text-ink-muted">
              {t("schedule.moveToDayLabel")}
            </span>
            <select
              value={targetDayId}
              onChange={(event) => setTargetDayId(event.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-canvas px-3 text-[14px] outline-none focus:border-accent"
            >
              <option value="">{t("schedule.pickDay")}</option>
              {otherDays.map((day) => {
                const label = [
                  day.name,
                  formatDay(day.date, locale),
                  day.city,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <option key={day.id} value={day.id}>
                    {label || day.id}
                  </option>
                );
              })}
            </select>
          </label>
          <button
            type="button"
            disabled={!targetDayId || pending}
            onClick={moveSelected}
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-accent px-3 text-[14px] font-medium text-white disabled:opacity-50"
          >
            {pending ? t("common.saving") : t("schedule.moveSelected")}
          </button>
        </div>
      ) : null}

      <AgendaItemEditSheet
        open={editId != null}
        onClose={() => setEditId(null)}
        item={editItem}
        dayId={dayId}
        dayDate={dateKey(dayDate)}
        city={dayCity}
      />
    </div>
  );
}
