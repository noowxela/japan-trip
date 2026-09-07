"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSpend, deleteSpend, updateSpend } from "@/app/actions";
import { ActionForm, useActionToast } from "@/components/action-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SpendAmountField } from "@/components/spend-amount-field";
import { useSlideIn } from "@/components/slide-in-page";
import { DatePicker } from "@/components/date-picker";
import { useEditSession } from "@/components/edit-session";
import {
  btnGhostClass,
  btnPrimaryClass,
  fieldClass,
  formShellClass,
} from "@/components/page-shell";
import { dateKey, formatTime, tokyoToday } from "@/lib/format";
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
}: {
  item?: SpendItem;
  days: TripDay[];
  people?: string[];
  defaultDayId?: string;
}) {
  const router = useRouter();
  const slide = useSlideIn();
  const { editorName } = useEditSession();
  const notify = useActionToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [dayDate, setDayDate] = useState(() =>
    initialDayDate(days, defaultDayId, item),
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
        action={item ? updateSpend : addSpend}
        onSuccess={goBack}
        className={`${formShellClass} grid gap-4`}
      >
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input type="hidden" name="kind" value={item?.kind ?? "Actual"} />
        <input type="hidden" name="dayId" value={dayId} />

        <label className="grid gap-1">
          <span className="text-xs font-medium text-stone-500">Name</span>
          <input
            name="name"
            required
            defaultValue={item?.name}
            placeholder="Lunch / hotel / JR pass"
            className={fieldClass}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-medium text-stone-500">Amount</span>
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
          <p className="-mt-2 truncate text-xs text-stone-500">{matchedDay.name}</p>
        ) : null}

        <div className="grid min-w-0 grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-stone-500">Category</span>
            <select
              name="category"
              defaultValue={item?.category ?? "Food"}
              className={fieldClass}
            >
              {SPEND_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-medium text-stone-500">Time (optional)</span>
            <input
              name="time"
              type="time"
              step="60"
              defaultValue={formatTime(item?.start ?? null) ?? ""}
              className={`${fieldClass} cursor-pointer`}
            />
          </label>
        </div>

        <PaidByField people={people} value={paidBy} onChange={setPaidBy} />

        <label className="grid gap-1">
          <span className="text-xs font-medium text-stone-500">Notes</span>
          <input
            name="notes"
            defaultValue={item?.notes}
            placeholder="Notes"
            className={fieldClass}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimaryClass}>
            {item ? "Save expense" : "Add expense"}
          </button>
          <button type="button" onClick={goBack} className={btnGhostClass}>
            Cancel
          </button>
        </div>
      </ActionForm>

      {item ? (
        <>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={`${btnGhostClass} mt-4 text-red-700`}
          >
            Delete expense
          </button>
          <ConfirmDialog
            open={confirmOpen}
            title="Delete spend?"
            message={`Remove “${item.name}”?`}
            confirmLabel="Delete"
            busy={busy}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => {
              const formData = new FormData();
              formData.set("id", item.id);
              startTransition(async () => {
                const result = await deleteSpend(formData);
                await notify(result);
                if (!result.ok) return;
                setConfirmOpen(false);
                goBack();
              });
            }}
          />
        </>
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
  const tags = [...people];
  if (value && !tags.some((name) => name.toLowerCase() === value.toLowerCase())) {
    tags.push(value);
  }

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-stone-500">Paid by</span>
      {tags.length > 0 ? (
        <>
          <input type="hidden" name="paidBy" value={value} />
          <div className="flex flex-wrap gap-2">
            {tags.map((name) => {
              const selected = name.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange(selected ? "" : name)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    selected
                      ? "bg-hanko text-white"
                      : "border border-sage bg-white text-stone-700"
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
          placeholder="Who paid?"
          className={fieldClass}
        />
      )}
    </div>
  );
}
