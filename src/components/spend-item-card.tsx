"use client";

import { useState, useTransition } from "react";
import { deleteSpend, updateSpend } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SpendAmountField } from "@/components/spend-amount-field";
import { formatSpend } from "@/lib/format";
import {
  SPEND_CATEGORIES,
  SPEND_KINDS,
  type SpendItem,
  type TripDay,
} from "@/lib/types";

const field =
  "rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]";

export function SpendItemCard({
  item,
  dayNames,
  days,
}: {
  item: SpendItem;
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
        action={updateSpend}
        className="grid min-w-0 gap-3 rounded-2xl border border-[#b42318]/30 bg-white p-4"
      >
        <input type="hidden" name="id" value={item.id} />
        <input name="name" required defaultValue={item.name} className={field} />
        <SpendAmountField defaultCurrency={item.currency} defaultAmount={item.amount} />
        <div className="grid grid-cols-2 gap-3">
          <select name="kind" defaultValue={item.kind ?? "Actual"} className={field}>
            {SPEND_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={item.category ?? "Other"}
            className={field}
          >
            {SPEND_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <select name="dayId" defaultValue={item.dayIds[0] ?? ""} className={field}>
          <option value="">No day</option>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {day.name}
            </option>
          ))}
        </select>
        <input name="notes" defaultValue={item.notes} className={field} />
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
      <div className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div>
          <p className="font-medium break-words">{item.name}</p>
          <p className="text-xs text-stone-500">
            {[
              item.category,
              item.currency,
              item.dayIds.map((id) => dayNames.get(id)).filter(Boolean).join(", "),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-right text-sm font-medium whitespace-nowrap">
            {formatSpend(item.amount, item.currency)}
          </p>
          <div className="flex gap-2">
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
        title="Delete spend?"
        message={`Remove “${item.name}”?`}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const formData = new FormData();
          formData.set("id", item.id);
          startTransition(async () => {
            await notify(await deleteSpend(formData));
            setConfirmOpen(false);
          });
        }}
      />
    </>
  );
}
