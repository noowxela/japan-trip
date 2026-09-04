"use client";

import { useState } from "react";
import { addSpend } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Modal } from "@/components/modal";
import { btnPrimaryClass, fieldClass } from "@/components/page-shell";
import { SpendAmountField } from "@/components/spend-amount-field";
import { SPEND_CATEGORIES, type TripDay } from "@/lib/types";

export function AddSpendForm({
  days,
  defaultDayId = "",
  onSuccess,
}: {
  days: TripDay[];
  defaultDayId?: string;
  onSuccess?: () => void;
}) {
  return (
    <ActionForm
      action={addSpend}
      onSuccess={onSuccess}
      className="grid gap-3"
    >
      <input
        name="name"
        required
        placeholder="Lunch / hotel / JR pass"
        className={fieldClass}
      />
      <SpendAmountField />
      <input type="hidden" name="kind" value="Actual" />
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <select name="dayId" defaultValue={defaultDayId} className={fieldClass}>
          <option value="">No day</option>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {day.name}
            </option>
          ))}
        </select>
        <select name="category" defaultValue="Food" className={fieldClass}>
          {SPEND_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <input name="notes" placeholder="Notes" className={fieldClass} />
      <button type="submit" className={btnPrimaryClass}>
        Save expense
      </button>
    </ActionForm>
  );
}

export function AddExpenseFab({
  days,
  defaultDayId = "",
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Add expense"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-hanko text-white md:right-8 md:bottom-8"
      >
        <PlusIcon />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add expense">
        <AddSpendForm
          days={days}
          defaultDayId={defaultDayId}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
