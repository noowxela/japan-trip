"use client";

import { addStay } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";

export function AddStayForm() {
  return (
    <ActionForm
      action={addStay}
      className={`${formShellClass} grid gap-3 notebook-card p-4`}
    >
      <p className="font-medium text-stone-900">Add a stay</p>
      <input
        name="name"
        required
        placeholder="Hotel name"
        className={fieldClass}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="checkIn"
          type="date"
          className={fieldClass}
        />
        <input
          name="checkOut"
          type="date"
          className={fieldClass}
        />
      </div>
      <input
        name="address"
        placeholder="Address"
        className={fieldClass}
      />
      <input
        name="bookingUrl"
        type="url"
        placeholder="Booking URL"
        className={fieldClass}
      />
      <input
        name="confirmation"
        placeholder="Confirmation code"
        className={fieldClass}
      />
      <button
        type="submit"
        className={btnPrimaryClass}
      >
        Add stay
      </button>
    </ActionForm>
  );
}
