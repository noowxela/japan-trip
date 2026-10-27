"use client";

import type { ReactNode } from "react";
import { useTransition } from "react";
import {
  deletePlace,
  deleteTransit,
  updatePlace,
  updateTransit,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import { dateKey, formatTime } from "@/lib/format";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import {
  PLACE_TYPES,
  TRANSIT_MODES,
  type Place,
  type Transit,
} from "@/lib/types";

const cell =
  "h-9 w-full min-w-0 rounded-lg border border-line px-2 text-sm outline-none focus:border-accent";

const rowClass =
  "grid w-full min-w-0 grid-cols-2 gap-2 border-b border-line p-2 last:border-b-0 lg:grid-cols-[minmax(0,8rem)_3.5rem_7rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-end lg:gap-2 lg:px-2 lg:py-1.5";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid min-w-0 gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-ink-muted lg:sr-only">
        {label}
      </span>
      {children}
    </label>
  );
}

function TimeField({ defaultValue }: { defaultValue?: string }) {
  return (
    <input
      name="time"
      type="time"
      step="60"
      defaultValue={defaultValue ?? ""}
      className={`${cell} cursor-pointer`}
      onClick={(event) => {
        const input = event.currentTarget;
        if (typeof input.showPicker !== "function") return;
        try {
          input.showPicker();
        } catch {
          // Browser may already have the picker open.
        }
      }}
    />
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  const { t } = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 notebook-btn bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
    >
      {pending ? t("common.saving") : t("common.save")}
    </button>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [busy, startTransition] = useTransition();
  const { t } = useT();

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        startTransition(async () => {
          await onDelete();
        });
      }}
      className="notebook-btn inline-flex min-h-11 shrink-0 items-center px-3 text-xs font-medium text-accent disabled:opacity-60"
    >
      {t("common.delete")}
    </button>
  );
}

export function AgendaEditTable({
  places,
  transit,
  dayId,
  dayDate,
}: {
  places: Place[];
  transit: Transit[];
  dayId: string;
  dayDate: string | null;
}) {
  const { t } = useT();
  const rows: Array<
    | { kind: "place"; place: Place }
    | { kind: "transit"; transit: Transit }
  > = [
    ...places
      .filter((place) => !place.pending)
      .map((place) => ({ kind: "place" as const, place })),
    ...transit.map((item) => ({ kind: "transit" as const, transit: item })),
  ].sort((a, b) => {
    const startA = (a.kind === "place" ? a.place.start : a.transit.start) ?? "9999";
    const startB = (b.kind === "place" ? b.place.start : b.transit.start) ?? "9999";
    if (startA !== startB) return startA.localeCompare(startB);
    const orderA = a.kind === "transit" ? (a.transit.order ?? 9999) : 9999;
    const orderB = b.kind === "transit" ? (b.transit.order ?? 9999) : 9999;
    return orderA - orderB;
  });

  if (rows.length === 0) {
    return (
      <p className="notebook-card border-dashed px-4 py-6 text-sm text-ink-muted shadow-none">
        {t("agenda.noStopsEdit")}
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden notebook-card">
      <div className="hidden grid-cols-[8rem_3.5rem_7rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2 border-b border-line px-3 py-2 text-[11px] font-medium text-ink-muted lg:grid">
        <span>{t("form.time")}</span>
        <span>#</span>
        <span>{t("form.kind")}</span>
        <span>{t("form.name")}</span>
        <span>{t("form.detail")}</span>
        <span className="text-right">{t("common.edit")}</span>
      </div>
      {rows.map((row) =>
        row.kind === "place" ? (
          <PlaceEditRow
            key={row.place.id}
            place={row.place}
            dayId={dayId}
            dayDate={dayDate}
          />
        ) : (
          <TransitEditRow
            key={row.transit.id}
            item={row.transit}
            dayId={dayId}
            dayDate={dayDate}
          />
        ),
      )}
    </div>
  );
}

function PlaceEditRow({
  place,
  dayId,
  dayDate,
}: {
  place: Place;
  dayId: string;
  dayDate: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();
  const trashWithUndo = useTrashUndo();
  const { t, locale } = useT();

  return (
    <form
      className={rowClass}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          await notify(await updatePlace(formData));
        });
      }}
    >
      <input type="hidden" name="id" value={place.id} />
      <input type="hidden" name="dayId" value={dayId} />
      <input type="hidden" name="dayDate" value={dateKey(dayDate) ?? ""} />
      <input type="hidden" name="mapsUrl" value={place.mapsUrl ?? ""} />
      <input type="hidden" name="notes" value={place.notes} />
      <Field label={t("form.time")}>
        <TimeField defaultValue={formatTime(place.start) ?? ""} />
      </Field>
      <div className="hidden lg:block" />
      <Field label={t("form.kind")} className="col-span-2 lg:col-span-1">
        <select name="type" defaultValue={place.type ?? "Sight"} className={cell}>
          {PLACE_TYPES.map((type) => (
            <option key={type} value={type}>
              {labelType(locale, type)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("form.name")} className="col-span-2 lg:col-span-2">
        <input
          name="name"
          required
          defaultValue={place.name}
          className={cell}
        />
      </Field>
      <div className="col-span-2 flex w-full min-w-0 justify-end gap-2 lg:col-span-1">
        <SaveButton pending={pending} />
        <DeleteButton
          onDelete={async () => {
            const formData = new FormData();
            formData.set("id", place.id);
            await trashWithUndo(await deletePlace(formData), place.id, "place");
          }}
        />
      </div>
    </form>
  );
}

function TransitEditRow({
  item,
  dayId,
  dayDate,
}: {
  item: Transit;
  dayId: string;
  dayDate: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();
  const trashWithUndo = useTrashUndo();
  const { t, locale } = useT();

  return (
    <form
      className={rowClass}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          await notify(await updateTransit(formData));
        });
      }}
    >
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="dayId" value={dayId} />
      <input
        type="hidden"
        name="dayDate"
        value={dateKey(dayDate) ?? dateKey(item.date) ?? ""}
      />
      <input type="hidden" name="bookingUrl" value={item.bookingUrl ?? ""} />
      <input
        name="date"
        type="hidden"
        value={dateKey(item.date) ?? dateKey(dayDate) ?? ""}
      />
      <Field label={t("form.time")}>
        <TimeField defaultValue={formatTime(item.start) ?? ""} />
      </Field>
      <Field label="#">
        <input
          name="order"
          type="number"
          defaultValue={item.order ?? ""}
          className={cell}
        />
      </Field>
      <Field label={t("form.kind")} className="col-span-2 lg:col-span-1">
        <select name="mode" defaultValue={item.mode ?? "Metro"} className={cell}>
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {labelMode(locale, mode)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("form.name")} className="col-span-2 lg:col-span-1">
        <input name="name" required defaultValue={item.name} className={cell} />
      </Field>
      <Field label={t("form.fromTo")} className="col-span-2 lg:col-span-1">
        <div className="grid grid-cols-2 gap-1">
          <input
            name="from"
            defaultValue={item.from}
            placeholder={t("form.from")}
            className={cell}
          />
          <input
            name="to"
            defaultValue={item.to}
            placeholder={t("form.to")}
            className={cell}
          />
        </div>
      </Field>
      <div className="col-span-2 flex w-full min-w-0 justify-end gap-2 lg:col-span-1">
        <SaveButton pending={pending} />
        <DeleteButton
          onDelete={async () => {
            const formData = new FormData();
            formData.set("id", item.id);
            await trashWithUndo(await deleteTransit(formData), item.id, "transit");
          }}
        />
      </div>
    </form>
  );
}
