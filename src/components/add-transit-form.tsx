"use client";

import { useMemo, useState } from "react";
import { addTransit } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { DatePicker } from "@/components/date-picker";
import {
  FlightLookupField,
  type FlightLookupFill,
} from "@/components/flight-lookup-field";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { dateKey, tokyoToday, tokyoWallDateTime } from "@/lib/format";
import { labelMode } from "@/lib/i18n/dictionaries";
import { TRANSIT_MODES, type TripDay } from "@/lib/types";

export function AddTransitForm({
  days,
  defaultDayId,
  dayDate,
  embedded = false,
  lockDay = false,
  autoFocus = false,
  onSuccess,
}: {
  days: TripDay[];
  defaultDayId?: string;
  dayDate?: string | null;
  embedded?: boolean;
  /** Pin the leg to defaultDayId (schedule add). Hides day and date pickers. */
  lockDay?: boolean;
  autoFocus?: boolean;
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
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const tripDates = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) set.add(key);
    }
    return set;
  }, [days]);
  const resolvedDate = lockDay ? (dateKey(dayDate ?? date) ?? date) : date;

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
          autoFocus={autoFocus}
          value={name}
          onChange={(event) => setName(event.target.value)}
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
      {mode === "Flight" ? (
        <FlightLookupField
          onFill={(fill: FlightLookupFill) => {
            setName(fill.name);
            setFrom(fill.from);
            setTo(fill.to);
            setBookingUrl(fill.bookingUrl);
            if (fill.time) setTime(fill.time);
            if (!lockDay) {
              if (fill.date) setDate(fill.date);
              const matched = days.find((day) => dateKey(day.date) === fill.date);
              if (matched) setDayId(matched.id);
            }
          }}
        />
      ) : null}
      {lockDay ? (
        <input
          type="hidden"
          name="date"
          value={resolvedDate}
        />
      ) : (
        <DatePicker
          name="date"
          value={date}
          onChange={setDate}
          tripDates={tripDates}
          label={t("form.date")}
        />
      )}
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-medium text-ink-muted break-words">
            {t("form.from")}
          </span>
          <input
            name="from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={`${fieldClass} min-w-0`}
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-medium text-ink-muted break-words">
            {t("form.to")}
          </span>
          <input
            name="to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={`${fieldClass} min-w-0`}
          />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">
          {t("form.bookingUrl")}
        </span>
        <input
          name="bookingUrl"
          type="url"
          value={bookingUrl}
          onChange={(event) => setBookingUrl(event.target.value)}
          className={fieldClass}
        />
      </label>
      {lockDay ? (
        <input type="hidden" name="dayId" value={defaultDayId ?? dayId} />
      ) : days.length > 0 ? (
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
      <input
        type="hidden"
        name="dayDate"
        value={resolvedDate}
      />
      <input
        type="hidden"
        name="start"
        value={resolvedDate && time ? tokyoWallDateTime(resolvedDate, time) : ""}
      />
      <div className="grid min-w-0 grid-cols-2 gap-3">
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-medium text-ink-muted">{t("form.time")}</span>
          <input
            type="time"
            step={60}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={`${fieldClass} min-w-0 cursor-pointer tabular-nums`}
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-medium text-ink-muted">{t("form.order")}</span>
          <input name="order" type="number" className={`${fieldClass} min-w-0 tabular-nums`} />
        </label>
      </div>
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.notes")}</span>
        <textarea name="notes" rows={2} className={fieldClass} />
      </label>
      <button type="submit" className={btnPrimaryClass}>
        {t("form.addTransit")}
      </button>
    </ActionForm>
  );
}
