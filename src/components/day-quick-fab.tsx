"use client";

import { useState } from "react";
import { AddAgendaForm } from "@/components/add-agenda-form";
import { AddPlaceForm } from "@/components/add-place-form";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { useQuickExpense } from "@/components/quick-expense-provider";
import { Modal } from "@/components/modal";
import { useT } from "@/components/i18n-provider";
import type { TripDay } from "@/lib/types";

export function DayQuickFab({
  dayId,
  dayDate,
  days,
  people = [],
}: {
  dayId: string;
  dayDate: string | null;
  days: TripDay[];
  people?: string[];
}) {
  const { t } = useT();
  const editOrUnlock = useEditOrUnlock();
  const { openQuickExpense } = useQuickExpense();
  const [open, setOpen] = useState<null | "menu" | "place" | "agenda">(null);

  return (
    <>
      <div className="tab-bar-follow fixed inset-x-0 bottom-0 z-20 flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] lg:hidden">
        <button
          type="button"
          onClick={() =>
            editOrUnlock(() => setOpen(open === "menu" ? null : "menu"))
          }
          className="notebook-btn bg-accent px-5 py-3 text-sm font-medium text-white"
        >
          {open === "menu" ? t("fab.close") : t("fab.quickAdd")}
        </button>
      </div>

      {open === "menu" ? (
        <div className="tab-bar-follow fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] z-20 notebook-card p-3 lg:hidden">
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => setOpen("place")}
              className="notebook-press rounded-xl bg-canvas px-4 py-3 text-left text-sm font-medium"
            >
              {t("fab.addPlace")}
            </button>
            <button
              type="button"
              onClick={() => setOpen("agenda")}
              className="notebook-press rounded-xl bg-canvas px-4 py-3 text-left text-sm font-medium"
            >
              {t("fab.addAgenda")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                openQuickExpense({ days, people, dayId });
              }}
              className="notebook-press rounded-xl bg-canvas px-4 py-3 text-left text-sm font-medium"
            >
              {t("fab.addSpend")}
            </button>
          </div>
        </div>
      ) : null}

      <Modal
        open={open === "place"}
        onClose={() => setOpen(null)}
        title={t("form.addPlace")}
      >
        <AddPlaceForm
          days={days}
          defaultDayId={dayId}
          embedded
          onSuccess={() => setOpen(null)}
        />
      </Modal>

      <Modal
        open={open === "agenda"}
        onClose={() => setOpen(null)}
        title={t("fab.addAgenda")}
      >
        <AddAgendaForm days={days} defaultDayId={dayId} dayDate={dayDate} />
      </Modal>
    </>
  );
}
