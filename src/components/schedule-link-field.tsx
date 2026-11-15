"use client";

import { ChipGroup } from "@/components/chip-group";
import { useT } from "@/components/i18n-provider";
import { categoryEmoji } from "@/lib/category-icon";
import {
  decodeScheduleLink,
  encodeScheduleLink,
  scheduleItemsForDay,
} from "@/lib/spend-link";
import type { Place, Transit } from "@/lib/types";

export function ScheduleLinkField({
  places,
  transit,
  dayId,
  placeId,
  transitId,
  onChange,
}: {
  places: Place[];
  transit: Transit[];
  dayId: string;
  placeId: string;
  transitId: string;
  onChange: (next: { placeId: string; transitId: string }) => void;
}) {
  const { t } = useT();
  const value = encodeScheduleLink(placeId, transitId);
  const options = scheduleItemsForDay(places, transit, dayId);
  const selectedPlace = places.find((place) => place.id === placeId);
  const selectedTransit = transit.find((item) => item.id === transitId);
  const selectedOnDay = options.some(
    (item) =>
      (item.kind === "place" && item.id === placeId) ||
      (item.kind === "transit" && item.id === transitId),
  );
  const chips = [
    { value: "", label: t("form.scheduleLinkNone") },
    ...options.map((item) => ({
      value: encodeScheduleLink(
        item.kind === "place" ? item.id : "",
        item.kind === "transit" ? item.id : "",
      ),
      label: (
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>
            {categoryEmoji(item.kind, item.chip) ?? "•"}
          </span>
          {item.name}
        </span>
      ),
    })),
  ];
  if (value && !selectedOnDay) {
    chips.push({
      value,
      label:
        selectedPlace?.name ||
        selectedTransit?.name ||
        t("form.scheduleLinkMissing"),
    });
  }

  return (
    <div className="grid gap-1">
      <ChipGroup
        name="scheduleLink"
        label={t("form.scheduleLink")}
        value={value}
        onChange={(next) => onChange(decodeScheduleLink(next))}
        options={chips}
      />
      <input type="hidden" name="placeId" value={placeId} />
      <input type="hidden" name="transitId" value={transitId} />
      {value && !selectedPlace && !selectedTransit ? (
        <p className="text-[11px] text-ink-muted">
          {t("form.scheduleLinkMissing")}
        </p>
      ) : options.length === 0 && !value ? (
        <p className="text-[11px] text-ink-muted">
          {t("form.scheduleLinkEmpty")}
        </p>
      ) : null}
    </div>
  );
}
