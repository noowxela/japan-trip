"use client";

import { ChipGroup } from "@/components/chip-group";
import { useT } from "@/components/i18n-provider";
import { foodPlacesForDay } from "@/lib/spend-place";
import type { Place } from "@/lib/types";

export function FoodPlaceField({
  places,
  dayId,
  value,
  onChange,
  name = "placeId",
}: {
  places: Place[];
  dayId: string;
  value: string;
  onChange: (placeId: string) => void;
  name?: string;
}) {
  const { t } = useT();
  const options = foodPlacesForDay(places, dayId);
  const selected = places.find((place) => place.id === value);
  const selectedOnDay = options.some((place) => place.id === value);
  const chips = [
    { value: "", label: t("form.foodPlaceNone") },
    ...options.map((place) => ({ value: place.id, label: place.name })),
  ];
  if (value && !selectedOnDay) {
    chips.push({
      value,
      label: selected?.name || t("form.foodPlaceMissing"),
    });
  }

  return (
    <div className="grid gap-1">
      <ChipGroup
        name={name}
        label={t("form.foodPlace")}
        value={value}
        onChange={onChange}
        options={chips}
      />
      {value && !selected ? (
        <p className="text-[11px] text-ink-muted">{t("form.foodPlaceMissing")}</p>
      ) : options.length === 0 && !value ? (
        <p className="text-[11px] text-ink-muted">{t("form.foodPlaceEmpty")}</p>
      ) : null}
    </div>
  );
}
