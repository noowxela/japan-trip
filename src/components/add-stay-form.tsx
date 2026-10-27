"use client";

import { useState } from "react";
import { addStay } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { tokyoToday } from "@/lib/format";

export function AddStayForm({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
} = {}) {
  const { t } = useT();
  const sheetClose = useListAddSheetClose();
  const [checkIn, setCheckIn] = useState(tokyoToday());
  const [checkOut, setCheckOut] = useState(tokyoToday());

  return (
    <ActionForm
      action={addStay}
      onSuccess={() => {
        onSuccess?.();
        sheetClose?.();
      }}
      className={`${embedded ? "grid gap-2" : `${formShellClass} grid gap-2`}`.trim()}
    >
      {!embedded ? (
        <p className="text-[14px] font-medium text-ink">{t("form.addStay")}</p>
      ) : null}
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">{t("form.name")}</span>
        <input
          name="name"
          required
          placeholder={t("form.hotelName")}
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          name="checkIn"
          value={checkIn}
          onChange={setCheckIn}
          label={t("form.checkIn")}
        />
        <DatePicker
          name="checkOut"
          value={checkOut}
          onChange={setCheckOut}
          label={t("form.checkOut")}
        />
      </div>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">{t("form.address")}</span>
        <input name="address" className={fieldClass} />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.bookingUrl")}
        </span>
        <input name="bookingUrl" type="url" className={fieldClass} />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.confirmation")}
        </span>
        <input name="confirmation" className={fieldClass} />
      </label>
      <button type="submit" className={btnPrimaryClass}>
        {t("form.addStay")}
      </button>
    </ActionForm>
  );
}
