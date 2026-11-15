"use client";

import { useState } from "react";
import { AddPlaceForm } from "@/components/add-place-form";
import { AddTransitForm } from "@/components/add-transit-form";
import { ChipGroup } from "@/components/chip-group";
import { useT } from "@/components/i18n-provider";
import type { TripDay } from "@/lib/types";

type Kind = "place" | "transit";
type Plan = "timed" | "pending";

export function AddAgendaForm({
  days,
  defaultDayId,
  dayDate,
  embedded = false,
  onSuccess,
}: {
  days: TripDay[];
  defaultDayId: string;
  dayDate: string | null;
  embedded?: boolean;
  onSuccess?: () => void;
}) {
  const { t } = useT();
  const [kind, setKind] = useState<Kind>("place");
  const [plan, setPlan] = useState<Plan>("timed");
  const [formKey, setFormKey] = useState(0);
  const [focusFirst, setFocusFirst] = useState(false);

  function handleSuccess() {
    setFormKey((n) => n + 1);
    setFocusFirst(true);
    onSuccess?.();
  }

  return (
    <div
      className={`grid min-w-0 gap-3 ${embedded ? "" : "notebook-card p-4"}`.trim()}
    >
      <div
        className={`flex min-w-0 flex-wrap items-center gap-3 ${
          embedded ? "" : "justify-between"
        }`}
      >
        {embedded ? null : (
          <p className="min-w-0 break-words [overflow-wrap:anywhere] font-medium text-ink">
            {t("fab.addAgenda")}
          </p>
        )}
        <ChipGroup
          className={embedded ? "w-full" : "min-w-0"}
          value={kind}
          onChange={setKind}
          options={[
            { value: "place", label: t("form.kindPlace") },
            { value: "transit", label: t("form.kindTransit") },
          ]}
        />
      </div>

      {kind === "place" ? (
        <AddPlaceForm
          key={`place-${formKey}`}
          days={days}
          defaultDayId={defaultDayId}
          embedded
          lockDay
          defaultPlan={plan}
          onPlanChange={setPlan}
          autoFocus={focusFirst}
          onSuccess={handleSuccess}
        />
      ) : (
        <AddTransitForm
          key={`transit-${formKey}`}
          days={days}
          defaultDayId={defaultDayId}
          dayDate={dayDate}
          embedded
          lockDay
          autoFocus={focusFirst}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
