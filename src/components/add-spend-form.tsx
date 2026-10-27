"use client";

import { useEffect } from "react";
import { useQuickExpense } from "@/components/quick-expense-provider";
import { useT } from "@/components/i18n-provider";
import type { TripDay } from "@/lib/types";

export function AddExpenseFab({
  days,
  people = [],
  defaultDayId = "",
}: {
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
}) {
  const { t } = useT();
  const { openQuickExpense, setTripData } = useQuickExpense();

  useEffect(() => {
    setTripData({ days, people });
  }, [days, people, setTripData]);

  return (
    <button
      type="button"
      aria-label={t("form.addSpend")}
      onClick={() =>
        openQuickExpense({
          days,
          people,
          dayId: defaultDayId || undefined,
        })
      }
      className="tab-bar-follow fixed right-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white md:right-8"
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
  );
}

export function OverviewExpenseFab(props: {
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
}) {
  return <AddExpenseFab {...props} />;
}
