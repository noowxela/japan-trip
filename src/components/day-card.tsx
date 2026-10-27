"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteDay, updateDay } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  compactFieldClass,
  compactLabelClass,
  RowMoreButton,
} from "@/components/compact";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { StatusBadge } from "@/components/status-badge";
import { btnGhostClass, btnPrimaryClass, cardClass } from "@/components/page-shell";
import { CityKanji } from "@/components/city-kanji";
import { dateKey, formatDay, tokyoToday } from "@/lib/format";
import { labelCity } from "@/lib/i18n/dictionaries";
import { CITIES, type TripDay } from "@/lib/types";

function scheduleDayHref(id: string, date: string | null) {
  const base = `/schedule?day=${encodeURIComponent(id)}`;
  return dateKey(date) === tokyoToday() ? `${base}&mode=now` : base;
}

export function DayCard({
  day,
  href = scheduleDayHref(day.id, day.date),
}: {
  day: TripDay;
  href?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();
  const canEdit = useCanEdit();
  const { t, locale } = useT();

  if (editing) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await updateDay(formData);
            await notify(result);
            if (result.ok) setEditing(false);
          });
        }}
        className={`grid gap-2 ${cardClass} !p-3`}
      >
        <input type="hidden" name="id" value={day.id} />
        <label className={`block ${compactLabelClass}`}>
          {t("form.name")}
          <input
            name="name"
            required
            defaultValue={day.name}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`block ${compactLabelClass}`}>
            {t("form.date")}
            <input
              name="date"
              type="date"
              defaultValue={dateKey(day.date) ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
          <label className={`block ${compactLabelClass}`}>
            {t("form.city")}
            <select
              name="city"
              defaultValue={day.city ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            >
              <option value="">{t("common.noCity")}</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {labelCity(locale, city)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className={btnPrimaryClass}
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={btnGhostClass}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={`ml-auto ${btnGhostClass} text-accent`}
          >
            {t("common.delete")}
          </button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title={t("day.deleteTitle")}
          message={t("day.deleteMessage", { name: day.name })}
          confirmLabel={t("day.deleteConfirm")}
          cancelLabel={t("common.cancel")}
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            const formData = new FormData();
            formData.set("id", day.id);
            startTransition(async () => {
              await deleteDay(formData);
            });
          }}
        />
      </form>
    );
  }

  const isHeader = href === null;
  const dateLabel = formatDay(day.date, locale);
  const cityLabel = day.city ? labelCity(locale, day.city) : null;

  if (isHeader) {
    return (
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1 text-[12px] text-ink-muted">
          <span className="tabular-nums">{dateLabel}</span>
          {cityLabel ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>·</span>
              <span>{cityLabel}</span>
              <CityKanji city={day.city} />
            </span>
          ) : null}
        </p>
        <h1 className="mt-0.5 text-[17px] font-semibold tracking-tight break-words sm:text-[18px]">
          {day.name}
        </h1>
      </div>
    );
  }

  return (
    <>
      <CompactRow
        href={href ?? undefined}
        title={
          <>
            <span className="tabular-nums">{dateLabel}</span>
            {cityLabel ? (
              <span className="font-normal text-ink-muted">
                {" "}
                · {cityLabel}
              </span>
            ) : null}
          </>
        }
        secondary={day.name}
        trailing={
          <>
            <StatusBadge status={day.status} />
            {canEdit ? (
              <RowMoreButton
                label={t("agenda.actionsFor", { name: day.name })}
                onClick={() => setMenuOpen(true)}
              />
            ) : (
              <span className="pr-2 text-[12px] text-ink-muted" aria-hidden>
                ›
              </span>
            )}
          </>
        }
      />
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={day.name}
      >
        <Link
          href={href!}
          className="notebook-btn inline-flex min-h-11 w-full items-center justify-start rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink no-underline"
          onClick={() => setMenuOpen(false)}
        >
          {t("common.openSchedule")}
        </Link>
        {canEdit ? (
          <ActionSheetItem
            onClick={() => {
              setMenuOpen(false);
              setEditing(true);
            }}
          >
            {t("day.edit")}
          </ActionSheetItem>
        ) : null}
        <ActionSheetItem onClick={() => setMenuOpen(false)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>
    </>
  );
}
