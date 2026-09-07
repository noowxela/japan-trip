"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlideInPage } from "@/components/slide-in-page";
import { pageShellClass } from "@/components/page-shell";
import { SpendForm } from "@/components/spend-form";
import type { TripDay } from "@/lib/types";

export function AddExpenseSheet({
  days,
  people = [],
  defaultDayId = "",
  onClose,
}: {
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
  onClose: () => void;
}) {
  return (
    <SlideInPage onClose={onClose}>
      <div className={`${pageShellClass} pt-4`}>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Add expense</h1>
          <p className="mt-1 text-sm text-stone-500">
            Saved to Notion and listed on the timeline.
          </p>
        </div>
        <SpendForm days={days} people={people} defaultDayId={defaultDayId} />
      </div>
    </SlideInPage>
  );
}

export function AddExpenseFab({
  days,
  people = [],
  defaultDayId = "",
}: {
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Add expense"
        onClick={() => setOpen(true)}
        className="tab-bar-follow fixed right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-hanko text-white md:right-8"
      >
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
      </button>
      {open ? (
        <AddExpenseSheet
          days={days}
          people={people}
          defaultDayId={defaultDayId}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
