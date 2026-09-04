"use client";

import { addSpend } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { SpendAmountField } from "@/components/spend-amount-field";
import { SPEND_CATEGORIES, SPEND_KINDS, type TripDay } from "@/lib/types";

export function AddSpendForm({
  days,
  defaultDayId = "",
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  return (
    <ActionForm
      action={addSpend}
      className={`${formShellClass} grid gap-3 notebook-card p-4`}
    >
      <p className="font-medium text-stone-900">Add spend</p>
      <input
        name="name"
        required
        placeholder="Lunch / hotel / JR pass"
        className={fieldClass}
      />
      <SpendAmountField />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="kind"
          defaultValue="Actual"
          className={fieldClass}
        >
          {SPEND_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue="Food"
          className={fieldClass}
        >
          {SPEND_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <select
        name="dayId"
        defaultValue={defaultDayId}
        className={fieldClass}
      >
        <option value="">No day</option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {day.name}
          </option>
        ))}
      </select>
      <input
        name="notes"
        placeholder="Notes"
        className={fieldClass}
      />
      <button
        type="submit"
        className={btnPrimaryClass}
      >
        Add spend
      </button>
    </ActionForm>
  );
}
