"use client";

import { addTransit } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { TRANSIT_MODES, type TripDay } from "@/lib/types";

export function AddTransitForm({
  days,
  defaultDayId,
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  return (
    <ActionForm
      action={addTransit}
      className={`${formShellClass} grid gap-3 notebook-card p-4`}
    >
      <p className="font-medium text-stone-900">Add transit</p>
      <input
        name="name"
        required
        placeholder="Nozomi 12"
        className={fieldClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="mode"
          defaultValue="Shinkansen"
          className={fieldClass}
        >
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
        <input
          name="date"
          type="date"
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="from"
          placeholder="From"
          className={fieldClass}
        />
        <input
          name="to"
          placeholder="To"
          className={fieldClass}
        />
      </div>
      <input
        name="bookingUrl"
        type="url"
        placeholder="Booking URL"
        className={fieldClass}
      />
      <select
        name="dayId"
        defaultValue={defaultDayId ?? ""}
        className={fieldClass}
      >
        <option value="">No day yet</option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {day.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="start"
          type="datetime-local"
          className={fieldClass}
        />
        <input
          name="order"
          type="number"
          placeholder="Order"
          className={fieldClass}
        />
      </div>
      <button
        type="submit"
        className={btnPrimaryClass}
      >
        Add transit
      </button>
    </ActionForm>
  );
}
