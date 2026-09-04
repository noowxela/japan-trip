"use client";

import { addDay } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { CITIES } from "@/lib/types";

export function AddDayForm() {
  return (
    <ActionForm
      action={addDay}
      className={`${formShellClass} grid gap-3 notebook-card p-4`}
    >
      <p className="font-medium text-stone-900">Add a day</p>
      <input
        name="name"
        required
        placeholder="Day 1 — Shibuya"
        className={fieldClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="date"
          type="date"
          className={fieldClass}
        />
        <select
          name="city"
          defaultValue="Tokyo"
          className={fieldClass}
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className={btnPrimaryClass}
      >
        Add day
      </button>
    </ActionForm>
  );
}
