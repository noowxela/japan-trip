"use client";

import { useState } from "react";
import { addDay } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { labelCity } from "@/lib/i18n/dictionaries";
import { tokyoToday } from "@/lib/format";
import { CITIES } from "@/lib/types";

export function AddDayForm({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
} = {}) {
  const { t, locale } = useT();
  const sheetClose = useListAddSheetClose();
  const [date, setDate] = useState(tokyoToday());
  const [city, setCity] = useState<(typeof CITIES)[number]>("Tokyo");

  return (
    <ActionForm
      action={addDay}
      onSuccess={() => {
        onSuccess?.();
        sheetClose?.();
      }}
      className={`${embedded ? "grid gap-2" : `${formShellClass} grid gap-2`}`.trim()}
    >
      {!embedded ? (
        <p className="text-[14px] font-medium text-ink">{t("days.add")}</p>
      ) : null}
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">{t("form.name")}</span>
        <input
          name="name"
          required
          placeholder={t("form.dayNameHint")}
          className={fieldClass}
        />
      </label>
      <DatePicker name="date" value={date} onChange={setDate} label={t("form.date")} />
      <ChipGroup
        name="city"
        label={t("form.city")}
        value={city}
        onChange={setCity}
        options={CITIES.map((value) => ({
          value,
          label: labelCity(locale, value) ?? value,
        }))}
      />
      <button type="submit" className={btnPrimaryClass}>
        {t("days.add")}
      </button>
    </ActionForm>
  );
}