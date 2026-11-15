"use client";

import { useTransition } from "react";
import { linkSpendToSchedule } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { fieldClass } from "@/components/page-shell";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import {
  decodeScheduleLink,
  encodeScheduleLink,
  groupScheduleItemsByDay,
  scheduleItemsForDay,
  scheduleLinkOptionLabel,
  type ScheduleLinkOption,
} from "@/lib/spend-link";
import type { Place, Transit, TripDay } from "@/lib/types";

function typeLabelFor(
  locale: "zh" | "en",
  item: Pick<ScheduleLinkOption, "kind" | "chip">,
) {
  return item.kind === "transit"
    ? labelMode(locale, item.chip)
    : labelType(locale, item.chip);
}

export function ScheduleLinkField({
  places,
  transit,
  days = [],
  dayId,
  placeId,
  transitId,
  spendId,
  onChange,
}: {
  places: Place[];
  transit: Transit[];
  days?: TripDay[];
  dayId: string;
  placeId: string;
  transitId: string;
  /** When set, choosing an option links/unlinks immediately. */
  spendId?: string;
  onChange: (next: { placeId: string; transitId: string }) => void;
}) {
  const { t, locale } = useT();
  const notify = useActionToast();
  const editOrUnlock = useEditOrUnlock();
  const [saving, startTransition] = useTransition();
  const value = encodeScheduleLink(placeId, transitId);
  const options = scheduleItemsForDay(places, transit, dayId);
  const groups = dayId ? null : groupScheduleItemsByDay(options, days);
  const selectedPlace = places.find((place) => place.id === placeId);
  const selectedTransit = transit.find((item) => item.id === transitId);
  const optionList = groups?.flatMap((group) => group.items) ?? options;
  const selectedOnList = optionList.some(
    (item) =>
      (item.kind === "place" && item.id === placeId) ||
      (item.kind === "transit" && item.id === transitId),
  );

  const orphan = (() => {
    if (!value || selectedOnList) return null;
    if (selectedPlace) {
      const item: ScheduleLinkOption = {
        kind: "place",
        id: selectedPlace.id,
        name: selectedPlace.name,
        chip: selectedPlace.type,
        start: selectedPlace.start,
        order: null,
        dayIds: selectedPlace.dayIds,
      };
      return {
        value,
        label: scheduleLinkOptionLabel(item, typeLabelFor(locale, item)),
      };
    }
    if (selectedTransit) {
      const item: ScheduleLinkOption = {
        kind: "transit",
        id: selectedTransit.id,
        name: selectedTransit.name,
        chip: selectedTransit.mode,
        start: selectedTransit.start,
        order: selectedTransit.order,
        dayIds: selectedTransit.dayIds,
      };
      return {
        value,
        label: scheduleLinkOptionLabel(item, typeLabelFor(locale, item)),
      };
    }
    return { value, label: t("form.scheduleLinkMissing") };
  })();

  function renderOption(item: ScheduleLinkOption) {
    const encoded = encodeScheduleLink(
      item.kind === "place" ? item.id : "",
      item.kind === "transit" ? item.id : "",
    );
    return (
      <option key={encoded} value={encoded}>
        {scheduleLinkOptionLabel(item, typeLabelFor(locale, item))}
      </option>
    );
  }

  function commit(next: { placeId: string; transitId: string }) {
    const prev = { placeId, transitId };
    onChange(next);
    if (!spendId) return;
    const formData = new FormData();
    formData.set("id", spendId);
    const encoded = encodeScheduleLink(next.placeId, next.transitId);
    if (encoded) formData.set("scheduleLink", encoded);
    startTransition(async () => {
      const result = await linkSpendToSchedule(formData);
      await notify(result);
      if (!result.ok) onChange(prev);
    });
  }

  function onSelectChange(nextValue: string) {
    const next = decodeScheduleLink(nextValue);
    if (spendId) {
      editOrUnlock(() => commit(next));
      return;
    }
    onChange(next);
  }

  return (
    <div className="grid min-w-0 gap-1">
      <label className="grid min-w-0 gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.scheduleLink")}
        </span>
        <select
          value={value}
          disabled={saving}
          onChange={(event) => onSelectChange(event.target.value)}
          className={`${fieldClass} max-w-full`}
        >
          <option value="">{t("form.scheduleLinkNone")}</option>
          {groups
            ? groups.map((group) =>
                group.label ? (
                  <optgroup key={group.dayId || "rest"} label={group.label}>
                    {group.items.map(renderOption)}
                  </optgroup>
                ) : (
                  group.items.map(renderOption)
                ),
              )
            : options.map(renderOption)}
          {orphan ? (
            <option value={orphan.value}>{orphan.label}</option>
          ) : null}
        </select>
      </label>
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
