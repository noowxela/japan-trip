"use client";

import { useState, useTransition } from "react";
import { deleteStay, updateStay } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { formatRange } from "@/lib/format";
import type { Stay } from "@/lib/types";

const field =
  "rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]";

export function StayCard({ stay }: { stay: Stay }) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();

  if (editing) {
    return (
      <ActionForm
        action={updateStay}
        className="grid gap-3 rounded-2xl border border-[#b42318]/30 bg-white p-4"
      >
        <input type="hidden" name="id" value={stay.id} />
        <input name="name" required defaultValue={stay.name} className={field} />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="checkIn"
            type="date"
            defaultValue={stay.checkIn?.slice(0, 10) ?? ""}
            className={field}
          />
          <input
            name="checkOut"
            type="date"
            defaultValue={stay.checkOut?.slice(0, 10) ?? ""}
            className={field}
          />
        </div>
        <input name="address" defaultValue={stay.address} className={field} />
        <input
          name="bookingUrl"
          type="url"
          defaultValue={stay.bookingUrl ?? ""}
          className={field}
        />
        <input
          name="confirmation"
          defaultValue={stay.confirmation}
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

  return (
    <>
      <div className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-stone-500">
              {formatRange(stay.checkIn, stay.checkOut)}
            </p>
            <p className="text-lg font-medium">{stay.name}</p>
            {stay.address ? (
              <p className="text-sm text-stone-600">{stay.address}</p>
            ) : null}
            {stay.confirmation ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm text-stone-500">Conf: {stay.confirmation}</p>
                <CopyButton value={stay.confirmation} />
              </div>
            ) : null}
            {stay.bookingUrl ? (
              <a
                href={stay.bookingUrl}
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
        title="Delete stay?"
        message={`Remove “${stay.name}”?`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("id", stay.id);
          startTransition(async () => {
            await notify(await deleteStay(formData));
            setConfirmOpen(false);
          });
        }}
      />
    </>
  );
}
