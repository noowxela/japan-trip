"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteTransit, updateTransit } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDay } from "@/lib/format";
import { TRANSIT_MODES, type Transit, type TripDay } from "@/lib/types";

const field =
  "rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]";

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

  if (editing) {
    return (
      <ActionForm
        action={updateTransit}
        className="grid gap-3 rounded-2xl border border-[#b42318]/30 bg-white p-4"
      >
        <input type="hidden" name="id" value={item.id} />
        <input name="name" required defaultValue={item.name} className={field} />
        <select name="mode" defaultValue={item.mode ?? "Metro"} className={field}>
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input name="from" defaultValue={item.from} className={field} />
          <input name="to" defaultValue={item.to} className={field} />
        </div>
        <input
          name="date"
          type="date"
          defaultValue={item.date?.slice(0, 10) ?? ""}
          className={field}
        />
        <select name="dayId" defaultValue={item.dayIds[0] ?? ""} className={field}>
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
          className={field}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-600"
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
      <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
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
                    <Link href={`/days/${day.id}`} className="text-[#b42318] underline">
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
                className="mt-2 inline-block text-sm text-[#b42318] underline"
                target="_blank"
                rel="noreferrer"
              >
                Booking
              </a>
            ) : null}
          </div>
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
