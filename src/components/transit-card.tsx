"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTransit, updateTransit } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  compactFieldClass,
  compactLabelClass,
  RowMoreButton,
} from "@/components/compact";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import { btnGhostClass, btnPrimaryClass } from "@/components/page-shell";
import {
  dateKey,
  formatDay,
  formatTabDate,
  formatTime,
  tokyoToday,
} from "@/lib/format";
import { labelMode } from "@/lib/i18n/dictionaries";
import { TRANSIT_MODES, type Transit, type TripDay } from "@/lib/types";

function scheduleDayHref(id: string, date: string | null) {
  const base = `/schedule?day=${encodeURIComponent(id)}`;
  return dateKey(date) === tokyoToday() ? `${base}&mode=now` : base;
}

export function TransitCard({
  item,
  dayNames,
  days,
}: {
  item: Transit;
  dayNames: Map<string, string>;
  days: TripDay[];
}) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const trashWithUndo = useTrashUndo();
  const canEdit = useCanEdit();
  const { t, locale } = useT();

  if (editing) {
    return (
      <ActionForm
        action={updateTransit}
        className="grid gap-2 rounded-xl border border-line bg-surface p-3"
        onSuccess={() => setEditing(false)}
      >
        <input type="hidden" name="id" value={item.id} />
        <label className={`block ${compactLabelClass}`}>
          {t("form.name")}
          <input
            name="name"
            required
            defaultValue={item.name}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <label className={`block ${compactLabelClass}`}>
          {t("form.mode")}
          <select
            name="mode"
            defaultValue={item.mode ?? "Metro"}
            className={`mt-1 ${compactFieldClass}`}
          >
            {TRANSIT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {labelMode(locale, mode)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`block ${compactLabelClass}`}>
            {t("form.from")}
            <input
              name="from"
              defaultValue={item.from}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
          <label className={`block ${compactLabelClass}`}>
            {t("form.to")}
            <input
              name="to"
              defaultValue={item.to}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className={`block ${compactLabelClass}`}>
            {t("form.date")}
            <input
              name="date"
              type="date"
              defaultValue={item.date?.slice(0, 10) ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
          <label className={`block ${compactLabelClass}`}>
            {t("form.day")}
            <select
              name="dayId"
              defaultValue={item.dayIds[0] ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            >
              <option value="">{t("transit.noDay")}</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={`block ${compactLabelClass}`}>
          {t("form.bookingUrl")}
          <input
            name="bookingUrl"
            type="url"
            defaultValue={item.bookingUrl ?? ""}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className={btnPrimaryClass}>
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={btnGhostClass}
          >
            {t("common.cancel")}
          </button>
        </div>
      </ActionForm>
    );
  }

  const dayLinks = item.dayIds.flatMap((id) => {
    const day = days.find((entry) => entry.id === id);
    const name = day?.name ?? dayNames.get(id);
    if (!name) return [];
    return [{ id, name, date: day?.date ?? null }];
  });
  const modeLabel = item.mode ? labelMode(locale, item.mode) : null;
  const route = [item.from, item.to].filter(Boolean).join(" → ");
  const dayMeta =
    dayLinks.length > 0
      ? dayLinks.map((day) => day.name).join(", ")
      : t("transit.unscheduled");
  const timeLabel = formatTime(item.start);
  const dateLabel = item.date ? formatDay(item.date, locale) : null;
  // Date lives in the leading column when there is no time — don't repeat it.
  const secondaryBits = [timeLabel && dateLabel ? dateLabel : null, dayMeta]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CompactRow
        leading={
          <span className="flex flex-col items-end gap-0 text-[12px] font-semibold leading-4 text-ink tabular-nums">
            {timeLabel ? (
              <span>{timeLabel}</span>
            ) : dateLabel ? (
              <span>{formatTabDate(item.date)}</span>
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </span>
        }
        title={
          <>
            {modeLabel ? (
              <span className="mr-1 inline-block rounded bg-transit-soft px-1 py-px text-[10px] font-medium text-transit align-middle">
                {modeLabel}
              </span>
            ) : null}
            {route || item.name}
          </>
        }
        meta={route ? item.name : undefined}
        secondary={secondaryBits || undefined}
        trailing={
          <RowMoreButton
            label={t("agenda.actionsFor", { name: item.name })}
            onClick={() => setMenuOpen(true)}
          />
        }
      />
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={item.name}
      >
        {canEdit ? (
          <ActionSheetItem
            onClick={() => {
              setMenuOpen(false);
              setEditing(true);
            }}
          >
            {t("common.edit")}
          </ActionSheetItem>
        ) : null}
        {dayLinks.map((day) => (
          <Link
            key={day.id}
            href={scheduleDayHref(day.id, day.date)}
            className="notebook-btn inline-flex min-h-11 w-full items-center justify-start rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink no-underline"
            onClick={() => setMenuOpen(false)}
          >
            {day.name}
          </Link>
        ))}
        {item.bookingUrl ? (
          <a
            href={item.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="notebook-btn inline-flex min-h-11 w-full items-center justify-start rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink no-underline"
            onClick={() => setMenuOpen(false)}
          >
            {t("transit.booking")}
          </a>
        ) : null}
        {canEdit ? (
          <ActionSheetItem
            danger
            disabled={busy}
            onClick={() => {
              const formData = new FormData();
              formData.set("id", item.id);
              setMenuOpen(false);
              startTransition(async () => {
                await trashWithUndo(
                  await deleteTransit(formData),
                  item.id,
                  "transit",
                );
              });
            }}
          >
            {t("common.delete")}
          </ActionSheetItem>
        ) : null}
        <ActionSheetItem onClick={() => setMenuOpen(false)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>
    </>
  );
}
