"use client";

import { useState } from "react";
import { AddPlaceForm } from "@/components/add-place-form";
import { Modal } from "@/components/modal";
import type { TripDay } from "@/lib/types";

export function AddPlaceModal({
  days,
  defaultDayId,
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        Add place
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add a place">
        <AddPlaceForm
          days={days}
          defaultDayId={defaultDayId}
          embedded
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
