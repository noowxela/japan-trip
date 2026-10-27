"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSpend, updateSpend } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { SpendAmountField } from "@/components/spend-amount-field";
import { useSlideIn } from "@/components/slide-in-page";
import { DatePicker } from "@/components/date-picker";
import { useEditSession } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import {
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
  formShellClass,
} from "@/components/page-shell";
import { dateKey, formatTime, tokyoToday } from "@/lib/format";
import { labelCategory } from "@/lib/i18n/dictionaries";
import { SPEND_CATEGORIES, type SpendItem, type TripDay } from "@/lib/types";

function dateForDayId(days: TripDay[], dayId: string) {
  return dateKey(days.find((day) => day.id === dayId)?.date ?? null);
}

function dayIdForDate(days: TripDay[], date: string) {
  if (!date) return "";
  return days.find((day) => dateKey(day.date) === date)?.id ?? "";
}

function initialDayDate(
  days: TripDay[],
  defaultDayId: string,
  item?: SpendItem,
) {
  return (
    dateKey(item?.start ?? null) ??
    dateForDayId(days, item?.dayIds[0] ?? defaultDayId) ??
    tokyoToday()
  );
}

export function SpendForm({
  item,
  days,
  people = [],
  defaultDayId = "",
  onSuccess,
}: {
  item?: SpendItem;
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const slide = useSlideIn();
  const { editorName } = useEditSession();
  const { t, locale } = useT();
  const trashWithUndo = useTrashUndo();
  const { submitSpend } = useOutbox();
  const [busy, startTransition] = useTransition();
  const [dayDate, setDayDate] = useState(() =>
    initialDayDate(days, defaultDayId, item),
  );
  const [category, setCategory] = useState(
    (item?.category as (typeof SPEND_CATEGORIES)[number] | undefined) ?? "Food",
  );
  const [paidBy, setPaidBy] = useState(
    item?.paidBy ?? editorName ?? people[0] ?? "",
  );
  const dayId = dayIdForDate(days, dayDate);
  const matchedDay = days.find((day) => day.id === dayId);
  const tripDates = useMemo(() => {
    const dates = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) dates.add(key);
    }
    return dates;
  }, [days]);

  function goBack() {
    onSuccess?.();
    if (slide) {
      slide.close();
      return;
    }
    router.push("/budget");
    router.refresh();
  }

  return (
    <>
      <ActionForm
        action={item ? updateSpend : submitSpend}
        onSuccess={goBack}
        className={`${formShellClass} grid gap-2.5`}
      >
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input type="hidden" name="kind" value={item?.kind ?? "Actual"} />
        <input type="hidden" name="dayId" value={dayId} />

        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.name")}</span>
          <input
            name="name"
            required
            defaultValue={item?.name}
            placeholder={t("budget.namePlaceholder")}
            className={fieldClass}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.amount")}</span>
          <SpendAmountField
            defaultCurrency={item?.currency}
            defaultAmount={item?.amount}
          />
        </label>

        <DatePicker
          name="dayDate"
          value={dayDate}
          onChange={setDayDate}
          tripDates={tripDates}
        />
        {matchedDay ? (
          <p className="-mt-2 truncate text-xs text-ink-muted">{matchedDay.name}</p>
        ) : null}

        <ChipGroup
          name="category"
          label={t("form.category")}
          value={
            SPEND_CATEGORIES.includes(
              category as (typeof SPEND_CATEGORIES)[number],
            )
              ? (category as (typeof SPEND_CATEGORIES)[number])
              : "Food"
          }
          onChange={setCategory}
          options={SPEND_CATEGORIES.map((value) => ({
            value,
            label: labelCategory(locale, value) ?? value,
          }))}
        />

        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">
            {t("budget.timeOptional")}
          </span>
          <input
            name="time"
            type="time"
            step="60"
            defaultValue={formatTime(item?.start ?? null) ?? ""}
            className={`${fieldClass} cursor-pointer`}
          />
        </label>

        <PaidByField people={people} value={paidBy} onChange={setPaidBy} />

        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.notes")}</span>
          <input
            name="notes"
            defaultValue={item?.notes}
            className={fieldClass}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimaryClass}>
            {item ? t("budget.save") : t("form.addSpend")}
          </button>
          <button type="button" onClick={goBack} className={btnGhostClass}>
            {t("common.cancel")}
          </button>
        </div>
      </ActionForm>

      {item ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const formData = new FormData();
            formData.set("id", item.id);
            startTransition(async () => {
              const result = await trashWithUndo(
                await deleteSpend(formData),
                item.id,
                "spend",
              );
              if (!result.ok) return;
              goBack();
            });
          }}
          className={`${btnGhostClass} mt-4 min-h-11 text-accent`}
        >
          {t("budget.delete")}
        </button>
      ) : null}
    </>
  );
}

function PaidByField({
  people,
  value,
  onChange,
}: {
  people: string[];
  value: string;
  onChange: (name: string) => void;
}) {
  const { t } = useT();
  const tags = [...people];
  if (value && !tags.some((name) => name.toLowerCase() === value.toLowerCase())) {
    tags.push(value);
  }

  return (
    <div className="grid gap-1">
      <span className="text-[12px] font-medium text-ink-muted">{t("form.paidBy")}</span>
      {tags.length > 0 ? (
        <>
          <input type="hidden" name="paidBy" value={value} />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("form.paidBy")}>
            {tags.map((name) => {
              const selected = name.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(selected ? "" : name)}
                  className={`notebook-btn inline-flex min-h-11 items-center px-3.5 text-sm font-medium ${
                    selected
                      ? "bg-accent text-white"
                      : "border border-line bg-surface text-ink"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <input
          name="paidBy"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass}
        />
      )}
    </div>
  );
}
