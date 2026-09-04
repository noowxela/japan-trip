"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTransit, updateTransit } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCanEdit } from "@/components/edit-session";
import { formatDay } from "@/lib/format";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/page-shell";
import { TRANSIT_MODES, type Transit, type TripDay } from "@/lib/types";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();
  const canEdit = useCanEdit();

  if (editing) {
    return (
      <ActionForm
        action={updateTransit}
        className="grid gap-3 notebook-card border-hanko/40 p-4"
      >
        <input type="hidden" name="id" value={item.id} />
        <input name="name" required defaultValue={item.name} className={fieldClass} />
        <select name="mode" defaultValue={item.mode ?? "Metro"} className={fieldClass}>
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input name="from" defaultValue={item.from} className={fieldClass} />
          <input name="to" defaultValue={item.to} className={fieldClass} />
        </div>
        <input
          name="date"
          type="date"
          defaultValue={item.date?.slice(0, 10) ?? ""}
          className={fieldClass}
        />
        <select name="dayId" defaultValue={item.dayIds[0] ?? ""} className={fieldClass}>
          <option value="">No day</option>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {day.name}
            </option>
          ))}
        </select>
        <input
          name="bookingUrl"
          type="url"
          defaultValue={item.bookingUrl ?? ""}
          className={fieldClass}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className={btnPrimaryClass}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={btnGhostClass}
          >
            Cancel
          </button>
        </div>
      </ActionForm>
    );
  }

  const dayLinks = item.dayIds
    .map((id) => ({ id, name: dayNames.get(id) }))
    .filter((entry): entry is { id: string; name: string } => Boolean(entry.name));

  return (
    <>
      <div className="min-w-0 notebook-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">
              {[item.mode, item.date ? formatDay(item.date) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-lg font-medium">{item.name}</p>
            <p className="text-sm text-stone-600">
              {[item.from, item.to].filter(Boolean).join(" → ")}
            </p>
            <p className="text-sm text-stone-500">
              {dayLinks.length > 0 ? (
                dayLinks.map((day, index) => (
                  <span key={day.id}>
                    {index > 0 ? ", " : null}
                    <Link href={`/days/${day.id}`} className="text-hanko underline">
                      {day.name}
                    </Link>
                  </span>
                ))
              ) : (
                "Unscheduled"
              )}
            </p>
            {item.bookingUrl ? (
              <a
                href={item.bookingUrl}
                className="mt-2 inline-block text-sm text-hanko underline"
                target="_blank"
                rel="noreferrer"
              >
                Booking
              </a>
            ) : null}
          </div>
          {canEdit ? (
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-stone-600"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-xs font-medium text-red-700"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete transit?"
        message={`Remove “${item.name}”?`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("id", item.id);
          startTransition(async () => {
            await notify(await deleteTransit(formData));
            setConfirmOpen(false);
          });
        }}
      />
    </>
  );
}
