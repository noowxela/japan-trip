"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import {
  deletePlace,
  deleteTransit,
  updatePlace,
  updateTransit,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { dateKey, formatTime } from "@/lib/format";
import {
  PLACE_TYPES,
  TRANSIT_MODES,
  type Place,
  type Transit,
} from "@/lib/types";

const cell =
  "w-full min-w-0 rounded-lg border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-[#b42318]";

const rowClass =
  "grid w-full min-w-0 grid-cols-2 gap-2 border-b border-stone-100 p-3 last:border-b-0 lg:grid-cols-[minmax(0,8rem)_3.5rem_7rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-end lg:gap-2 lg:px-3 lg:py-2";

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
      <span className="text-[11px] font-medium uppercase tracking-wide text-stone-500 lg:sr-only">
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
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-full bg-[#b42318] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

function DeleteButton({
  name,
  onDelete,
}: {
  name: string;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-red-700"
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete stop?"
        message={`Remove “${name}”?`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            await onDelete();
            setConfirmOpen(false);
          });
        }}
      />
    </>
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
    const orderA = (a.kind === "place" ? a.place.order : a.transit.order) ?? 9999;
    const orderB = (b.kind === "place" ? b.place.order : b.transit.order) ?? 9999;
    return orderA - orderB;
  });

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-stone-200 bg-white px-4 py-6 text-sm text-stone-500">
        No stops yet. Add a place or transit below.
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="hidden grid-cols-[8rem_3.5rem_7rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-2 border-b border-stone-200 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-stone-500 lg:grid">
        <span>Time</span>
        <span>#</span>
        <span>Kind</span>
        <span>Name</span>
        <span>Detail</span>
        <span className="text-right">Edit</span>
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
      <Field label="Time">
        <TimeField defaultValue={formatTime(place.start) ?? ""} />
      </Field>
      <Field label="#">
        <input
          name="order"
          type="number"
          defaultValue={place.order ?? ""}
          className={cell}
        />
      </Field>
      <Field label="Kind" className="col-span-2 lg:col-span-1">
        <select name="type" defaultValue={place.type ?? "Sight"} className={cell}>
          {PLACE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name" className="col-span-2 lg:col-span-2">
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
          name={place.name}
          onDelete={async () => {
            const formData = new FormData();
            formData.set("id", place.id);
            await notify(await deletePlace(formData));
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
      <Field label="Time">
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
      <Field label="Kind" className="col-span-2 lg:col-span-1">
        <select name="mode" defaultValue={item.mode ?? "Metro"} className={cell}>
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Name" className="col-span-2 lg:col-span-1">
        <input name="name" required defaultValue={item.name} className={cell} />
      </Field>
      <Field label="From / to" className="col-span-2 lg:col-span-1">
        <div className="grid grid-cols-2 gap-1">
          <input
            name="from"
            defaultValue={item.from}
            placeholder="From"
            className={cell}
          />
          <input
            name="to"
            defaultValue={item.to}
            placeholder="To"
            className={cell}
          />
        </div>
      </Field>
      <div className="col-span-2 flex w-full min-w-0 justify-end gap-2 lg:col-span-1">
        <SaveButton pending={pending} />
        <DeleteButton
          name={item.name}
          onDelete={async () => {
            const formData = new FormData();
            formData.set("id", item.id);
            await notify(await deleteTransit(formData));
          }}
        />
      </div>
    </form>
  );
}
