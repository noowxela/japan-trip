"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteDay, updateDay } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";
import { dateKey, formatDay } from "@/lib/format";
import { CITIES, type TripDay } from "@/lib/types";

const fieldClass =
  "rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]";

export function DayCard({
  day,
  href = `/days/${day.id}`,
}: {
  day: TripDay;
  href?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();

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
        className="grid gap-3 rounded-2xl border border-[#b42318]/40 bg-white p-4"
      >
        <input type="hidden" name="id" value={day.id} />
        <input
          name="name"
          required
          defaultValue={day.name}
          className={fieldClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="date"
            type="date"
            defaultValue={dateKey(day.date) ?? ""}
            className={fieldClass}
          />
          <select
            name="city"
            defaultValue={day.city ?? ""}
            className={fieldClass}
          >
            <option value="">No city</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="ml-auto rounded-full px-4 py-2 text-sm font-medium text-red-700"
          >
            Delete
          </button>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          title="Delete day?"
          message={`Remove “${day.name}” from the trip?`}
          confirmLabel="Delete day"
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

  const meta = (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-xs uppercase tracking-wide text-stone-500">
        {formatDay(day.date)}
        {day.city ? ` · ${day.city}` : ""}
      </p>
      <StatusBadge status={day.status} />
    </div>
  );
  const title = href ? (
    <p className="mt-1 text-lg font-medium break-words">{day.name}</p>
  ) : (
    <h1 className="mt-1 font-serif text-2xl tracking-tight break-words sm:text-3xl">
      {day.name}
    </h1>
  );
  const body = (
    <>
      {meta}
      {title}
    </>
  );

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 hover:border-[#b42318]/40">
      <div className="flex items-start justify-between gap-3">
        {href ? (
          <Link href={href} className="min-w-0 flex-1">
            {body}
          </Link>
        ) : (
          <div className="min-w-0 flex-1">{body}</div>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
