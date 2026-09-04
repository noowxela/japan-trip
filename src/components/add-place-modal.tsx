"use client";

import { useState } from "react";
import { AddPlaceForm } from "@/components/add-place-form";
import { Modal } from "@/components/modal";
import { btnPrimaryClass } from "@/components/page-shell";
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
        className={`shrink-0 ${btnPrimaryClass}`}
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
