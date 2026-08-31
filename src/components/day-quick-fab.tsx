"use client";

import Link from "next/link";
import { useState } from "react";
import { AddAgendaForm } from "@/components/add-agenda-form";
import { AddPlaceForm } from "@/components/add-place-form";
import type { TripDay } from "@/lib/types";

export function DayQuickFab({
  dayId,
  dayDate,
  days,
}: {
  dayId: string;
  dayDate: string | null;
  days: TripDay[];
}) {
  const [open, setOpen] = useState<null | "menu" | "place" | "agenda">(null);

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(open === "menu" ? null : "menu")}
          className="rounded-full bg-[#b42318] px-5 py-3 text-sm font-medium text-white shadow-lg"
        >
          {open === "menu" ? "Close" : "Quick add"}
        </button>
      </div>

      {open === "menu" ? (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-20 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl lg:hidden">
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setOpen("place")}
              className="rounded-xl bg-stone-100 px-4 py-3 text-left text-sm font-medium"
            >
              Add place
            </button>
            <button
              type="button"
              onClick={() => setOpen("agenda")}
              className="rounded-xl bg-stone-100 px-4 py-3 text-left text-sm font-medium"
            >
              Add agenda item
            </button>
            <Link
              href={`/spend?day=${dayId}`}
              className="rounded-xl bg-stone-100 px-4 py-3 text-sm font-medium"
            >
              Log spend
            </Link>
          </div>
        </div>
      ) : null}

      {open === "place" ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-[#f6f1e8]/95 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:hidden">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={() => setOpen("menu")}
              className="mb-3 text-sm font-medium text-stone-600"
            >
              Back
            </button>
            <AddPlaceForm
              days={days}
              defaultDayId={dayId}
              compact
              onSuccess={() => setOpen(null)}
            />
          </div>
        </div>
      ) : null}

      {open === "agenda" ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-[#f6f1e8]/95 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] lg:hidden">
          <div className="mx-auto max-w-xl">
            <button
              type="button"
              onClick={() => setOpen("menu")}
              className="mb-3 text-sm font-medium text-stone-600"
            >
              Back
            </button>
            <AddAgendaForm days={days} defaultDayId={dayId} dayDate={dayDate} />
          </div>
        </div>
      ) : null}
    </>
  );
}
