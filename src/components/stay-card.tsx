"use client";

import { useState, useTransition } from "react";
import { deleteStay, updateStay } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCanEdit } from "@/components/edit-session";
import { CopyButton } from "@/components/copy-button";
import { formatRange } from "@/lib/format";
import type { Stay } from "@/lib/types";
import { btnGhostClass, btnPrimaryClass, fieldClass } from "@/components/page-shell";

export function StayCard({ stay }: { stay: Stay }) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();
  const canEdit = useCanEdit();

  if (editing) {
    return (
      <ActionForm
        action={updateStay}
        className="grid gap-3 notebook-card border-hanko/40 p-4"
      >
        <input type="hidden" name="id" value={stay.id} />
        <input name="name" required defaultValue={stay.name} className={fieldClass} />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="checkIn"
            type="date"
            defaultValue={stay.checkIn?.slice(0, 10) ?? ""}
            className={fieldClass}
          />
          <input
            name="checkOut"
            type="date"
            defaultValue={stay.checkOut?.slice(0, 10) ?? ""}
            className={fieldClass}
          />
        </div>
        <input name="address" defaultValue={stay.address} className={fieldClass} />
        <input
          name="bookingUrl"
          type="url"
          defaultValue={stay.bookingUrl ?? ""}
          className={fieldClass}
        />
        <input
          name="confirmation"
          defaultValue={stay.confirmation}
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

  return (
    <>
      <div className="min-w-0 notebook-card p-4">
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
