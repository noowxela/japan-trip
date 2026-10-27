"use client";

import { AddPlaceForm } from "@/components/add-place-form";
import { ListAddSheet } from "@/components/list-add-sheet";
import { useT } from "@/components/i18n-provider";
import type { TripDay } from "@/lib/types";

export function AddPlaceModal({
  days,
  defaultDayId,
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  const { t } = useT();

  return (
    <ListAddSheet title={t("form.addPlace")}>
      <AddPlaceForm days={days} defaultDayId={defaultDayId} embedded />
    </ListAddSheet>
  );
}
