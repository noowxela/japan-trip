"use client";

import { useMemo, useState } from "react";
import { addTransit } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { dateKey, tokyoToday, tokyoWallDateTime } from "@/lib/format";
import { labelMode } from "@/lib/i18n/dictionaries";
import { TRANSIT_MODES, type TripDay } from "@/lib/types";

export function AddTransitForm({
  days,
  defaultDayId,
  embedded = false,
  onSuccess,
}: {
  days: TripDay[];
  defaultDayId?: string;
  embedded?: boolean;
  onSuccess?: () => void;
}) {
  const { t, locale } = useT();
  const sheetClose = useListAddSheetClose();
  const [mode, setMode] = useState<(typeof TRANSIT_MODES)[number]>("Shinkansen");
  const [dayId, setDayId] = useState(defaultDayId ?? "");
  const [date, setDate] = useState(() => {
    const matched = days.find((day) => day.id === defaultDayId);
    return dateKey(matched?.date ?? null) ?? tokyoToday();
  });
  const [time, setTime] = useState("");
  const tripDates = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) set.add(key);
    }
    return set;
  }, [days]);

  return (
    <ActionForm
      action={addTransit}
      onSuccess={() => {
        onSuccess?.();
        sheetClose?.();
      }}
      className={`${embedded ? "grid gap-2" : `${formShellClass} grid gap-2`}`.trim()}
    >
      {!embedded ? (
        <p className="font-medium text-ink">{t("form.addTransit")}</p>
      ) : null}
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.name")}</span>
        <input
          name="name"
          required
          placeholder={t("form.transitExample")}
          className={fieldClass}
        />
      </label>
      <ChipGroup
        name="mode"
        label={t("form.mode")}
        value={mode}
        onChange={setMode}
        options={TRANSIT_MODES.map((value) => ({
          value,
          label: labelMode(locale, value) ?? value,
        }))}
      />
      <DatePicker
        name="date"
        value={date}
        onChange={setDate}
        tripDates={tripDates}
        label={t("form.date")}
      />
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-ink-muted">{t("form.from")}</span>
          <input name="from" className={fieldClass} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-ink-muted">{t("form.to")}</span>
          <input name="to" className={fieldClass} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">
          {t("form.bookingUrl")}
        </span>
        <input name="bookingUrl" type="url" className={fieldClass} />
      </label>
      {days.length > 0 ? (
        <ChipGroup
          name="dayId"
          label={t("form.day")}
          value={dayId || days[0].id}
          onChange={setDayId}
          options={days.map((day) => ({ value: day.id, label: day.name }))}
        />
      ) : (
        <input type="hidden" name="dayId" value="" />
      )}
      <input type="hidden" name="dayDate" value={date} />
      <input
        type="hidden"
        name="start"
        value={date && time ? tokyoWallDateTime(date, time) : ""}
      />
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.time")}</span>
        <input
          type="time"
          step={60}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          className={`${fieldClass} cursor-pointer`}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.order")}</span>
        <input name="order" type="number" className={fieldClass} />
      </label>
      <button type="submit" className={btnPrimaryClass}>
        {t("form.addTransit")}
      </button>
    </ActionForm>
  );
}
