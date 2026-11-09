"use client";

import { useState, useTransition } from "react";
import {
  deletePlace,
  deleteTransit,
  searchPlaces,
  updatePlace,
  updateTransit,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { ClearableInput } from "@/components/clearable-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import {
  btnPrimaryClass,
  fieldClass,
} from "@/components/page-shell";
import { useTrashUndo } from "@/components/use-trash-undo";
import { categoryEmoji } from "@/lib/category-icon";
import { dateKey, formatDay, formatTime } from "@/lib/format";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import { isGoogleMapsUrl } from "@/lib/maps-url";
import {
  PLACE_TYPES,
  TRANSIT_MODES,
  type AgendaItem,
  type TripDay,
} from "@/lib/types";

export function AgendaItemEditSheet({
  open,
  onClose,
  item,
  dayId,
  dayDate,
  days,
  city,
}: {
  open: boolean;
  onClose: () => void;
  item: AgendaItem | null;
  dayId: string;
  dayDate: string | null;
  days: TripDay[];
  city?: string | null;
}) {
  const { t } = useT();
  const title = item?.name ?? t("common.edit");

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {open && item ? (
        <AgendaItemEditForm
          key={item.id}
          item={item}
          dayId={dayId}
          dayDate={dayDate}
          days={days}
          city={city}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function AgendaItemEditForm({
  item,
  dayId,
  dayDate,
  days,
  city,
  onClose,
}: {
  item: AgendaItem;
  dayId: string;
  dayDate: string | null;
  days: TripDay[];
  city?: string | null;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const notify = useActionToast();
  const trashWithUndo = useTrashUndo();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [mapsError, setMapsError] = useState("");
  const [resolvingMaps, startMaps] = useTransition();

  const [selectedDayId, setSelectedDayId] = useState(dayId);
  const selectedDay = days.find((day) => day.id === selectedDayId) ?? null;
  const dayDateKey =
    dateKey(selectedDay?.date ?? null) ?? dateKey(dayDate) ?? "";
  const [time, setTime] = useState(() => formatTime(item.start) ?? "");
  const [name, setName] = useState(item.name);
  const [type, setType] = useState<(typeof PLACE_TYPES)[number]>(
    () =>
      (PLACE_TYPES.includes(item.chip as (typeof PLACE_TYPES)[number])
        ? item.chip
        : "Sight") as (typeof PLACE_TYPES)[number],
  );
  const [mode, setMode] = useState<(typeof TRANSIT_MODES)[number]>(
    () =>
      (TRANSIT_MODES.includes(item.chip as (typeof TRANSIT_MODES)[number])
        ? item.chip
        : "Metro") as (typeof TRANSIT_MODES)[number],
  );
  const [mapsUrl, setMapsUrl] = useState(item.mapsUrl ?? "");
  const [notes, setNotes] = useState(
    item.kind === "place" ? item.detail : "",
  );
  const [order, setOrder] = useState(
    item.order != null ? String(item.order) : "",
  );
  const [from, setFrom] = useState(item.from ?? "");
  const [to, setTo] = useState(item.to ?? "");

  function resolveMapsField(raw: string) {
    const value = raw.trim();
    if (!isGoogleMapsUrl(value)) return;
    setMapsError("");
    startMaps(async () => {
      const hits = await searchPlaces(value, city ?? undefined);
      if (hits[0]) {
        setMapsUrl(hits[0].mapsUrl || value);
        setMapsError("");
      } else {
        setMapsError(t("form.mapsLinkFailed"));
      }
    });
  }

  function clearMapsLink() {
    setMapsUrl("");
    setMapsError("");
  }

  function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("id", item.id);
    formData.set("dayId", selectedDayId || dayId);
    formData.set("dayDate", dayDateKey);
    formData.set("name", trimmed);
    formData.set("time", time);

    if (item.kind === "place") {
      formData.set("type", type);
      formData.set("mapsUrl", mapsUrl.trim());
      formData.set("notes", notes);
      startTransition(async () => {
        const result = await updatePlace(formData);
        await notify(result);
        if (result.ok) onClose();
      });
      return;
    }

    formData.set("mode", mode);
    formData.set("order", order);
    formData.set("from", from);
    formData.set("to", to);
    formData.set("date", dayDateKey);
    startTransition(async () => {
      const result = await updateTransit(formData);
      await notify(result);
      if (result.ok) onClose();
    });
  }

  function onDelete() {
    const formData = new FormData();
    formData.set("id", item.id);
    setConfirmDelete(false);
    startTransition(async () => {
      if (item.kind === "transit") {
        await trashWithUndo(await deleteTransit(formData), item.id, "transit");
      } else {
        await trashWithUndo(await deletePlace(formData), item.id, "place");
      }
      onClose();
    });
  }

  const typeOptions = PLACE_TYPES.map((value) => ({
    value,
    label: (
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>{categoryEmoji("place", value)}</span>
        {labelType(locale, value) ?? value}
      </span>
    ),
  }));

  const modeOptions = TRANSIT_MODES.map((value) => ({
    value,
    label: (
      <span className="inline-flex items-center gap-1">
        <span aria-hidden>{categoryEmoji("transit", value)}</span>
        {labelMode(locale, value) ?? value}
      </span>
    ),
  }));

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-[4.75rem]">
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.time")}</span>
        <input
          type="time"
          step={60}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          onClick={(event) => {
            const input = event.currentTarget;
            if (typeof input.showPicker !== "function") return;
            try {
              input.showPicker();
            } catch {
              /* picker may already be open */
            }
          }}
          className={`${fieldClass} cursor-pointer`}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">
          {t("schedule.moveToDayLabel")}
        </span>
        <select
          value={selectedDayId}
          onChange={(event) => setSelectedDayId(event.target.value)}
          className={fieldClass}
        >
          {days.map((day) => {
            const label = [day.name, formatDay(day.date, locale), day.city]
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

      {item.kind === "place" ? (
        <ChipGroup
          label={t("form.type")}
          value={type}
          onChange={setType}
          options={typeOptions}
        />
      ) : (
        <>
          <ChipGroup
            label={t("form.mode")}
            value={mode}
            onChange={setMode}
            options={modeOptions}
          />
          <label className="grid gap-1">
            <span className="text-xs font-medium text-ink-muted">
              {t("form.order")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              className={fieldClass}
            />
          </label>
        </>
      )}

      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.name")}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className={fieldClass}
        />
      </label>

      {item.kind === "place" ? (
        <>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-ink-muted">
              {t("form.mapsUrl")}
            </span>
            <ClearableInput
              type="url"
              value={mapsUrl}
              onChange={(event) => setMapsUrl(event.target.value)}
              onBlur={(event) => resolveMapsField(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text").trim();
                if (!isGoogleMapsUrl(pasted)) return;
                setMapsUrl(pasted);
                resolveMapsField(pasted);
              }}
              onClear={clearMapsLink}
              clearLabel={t("form.clearMapsLink")}
              placeholder={t("form.mapsUrlHint")}
              className={fieldClass}
            />
            {resolvingMaps ? (
              <span className="text-xs text-ink-muted">{t("common.loading")}</span>
            ) : null}
            {mapsError ? (
              <span className="text-xs text-accent">{mapsError}</span>
            ) : null}
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-ink-muted">
              {t("form.notes")}
            </span>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className={`${fieldClass} h-auto min-h-[5.5rem] py-2.5 text-[16px] leading-5`}
            />
          </label>
        </>
      ) : (
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-ink-muted">
              {t("form.from")}
            </span>
            <textarea
              rows={2}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={`${fieldClass} h-auto min-h-[3rem] py-2.5 text-[16px] leading-5`}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-ink-muted">
              {t("form.to")}
            </span>
            <textarea
              rows={3}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={`${fieldClass} h-auto min-h-[4rem] py-2.5 text-[16px] leading-5`}
            />
          </label>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-line bg-canvas px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="notebook-btn min-h-11 shrink-0 px-4 text-sm font-medium text-accent disabled:opacity-60"
          >
            {t("common.delete")}
          </button>
          <button
            type="button"
            disabled={pending || !name.trim()}
            data-haptic="manual"
            onClick={onSave}
            className={`${btnPrimaryClass} min-h-11 flex-1 py-3`}
          >
            {pending
              ? t("common.saving")
              : selectedDayId !== dayId
                ? t("agenda.moveToDay")
                : t("common.save")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("agenda.deleteStop")}
        message={t("agenda.deleteStopMessage", { name: item.name })}
        confirmLabel={t("common.delete")}
        busy={pending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </div>
  );
}
