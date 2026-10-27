"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { deleteSpend } from "@/app/actions";
import { ChipGroup } from "@/components/chip-group";
import { DatePicker } from "@/components/date-picker";
import { useEditSession } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { useOutbox } from "@/components/outbox-provider";
import { btnPrimaryClass, fieldClass } from "@/components/page-shell";
import { useToast } from "@/components/toast-provider";
import { dateKey, formatDay, tokyoNowTime, tokyoToday } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import { labelCategory } from "@/lib/i18n/dictionaries";
import { deleteOutboxEntry, listOutbox } from "@/lib/outbox";
import {
  SPEND_CATEGORIES,
  type SpendCurrency,
  type TripDay,
} from "@/lib/types";

const CURRENCY_KEY = "japan-trip-quick-currency";
const PAYER_KEY = "japan-trip-quick-payer";

export type QuickExpenseDefaults = {
  dayId?: string;
  category?: (typeof SPEND_CATEGORIES)[number];
  currency?: SpendCurrency;
  people?: string[];
  days?: TripDay[];
};

function readStoredCurrency(): SpendCurrency {
  if (typeof window === "undefined") return "Yen";
  const raw = window.localStorage.getItem(CURRENCY_KEY);
  return raw === "RM" ? "RM" : "Yen";
}

function readStoredPayer(people: string[], editorName: string | null) {
  if (typeof window === "undefined") return editorName ?? people[0] ?? "";
  const raw = window.localStorage.getItem(PAYER_KEY)?.trim() ?? "";
  if (raw && people.some((p) => p.toLowerCase() === raw.toLowerCase())) {
    return people.find((p) => p.toLowerCase() === raw.toLowerCase()) ?? raw;
  }
  return editorName ?? people[0] ?? raw;
}

function dayIdForDate(days: TripDay[], date: string) {
  if (!date) return "";
  return days.find((day) => dateKey(day.date) === date)?.id ?? "";
}

export function QuickExpenseSheet({
  open,
  onClose,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  defaults: QuickExpenseDefaults;
}) {
  const { t } = useT();
  const sessionKey = open
    ? `${defaults.dayId ?? ""}:${defaults.category ?? ""}:${(defaults.days ?? []).length}`
    : "closed";

  return (
    <Modal open={open} onClose={onClose} title={t("form.addSpend")}>
      {open ? (
        <QuickExpenseForm
          key={sessionKey}
          defaults={defaults}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function QuickExpenseForm({
  defaults,
  onClose,
}: {
  defaults: QuickExpenseDefaults;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const { toast } = useToast();
  const { editorName } = useEditSession();
  const { submitSpend, refresh } = useOutbox();
  const [pending, startTransition] = useTransition();
  const amountRef = useRef<HTMLInputElement>(null);

  const days = useMemo(() => defaults.days ?? [], [defaults.days]);
  const people = useMemo(() => defaults.people ?? [], [defaults.people]);

  const initialDay =
    days.find((d) => d.id === defaults.dayId) ??
    days.find((d) => dateKey(d.date) === tokyoToday()) ??
    days[0];
  const initialDate = dateKey(initialDay?.date ?? null) ?? tokyoToday();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<SpendCurrency>(
    () => defaults.currency ?? readStoredCurrency(),
  );
  const [category, setCategory] = useState<
    (typeof SPEND_CATEGORIES)[number]
  >(defaults.category ?? "Food");
  const [paidBy, setPaidBy] = useState(() =>
    readStoredPayer(people, editorName),
  );
  const [name, setName] = useState("");
  const [dayDate, setDayDate] = useState(initialDate);
  const [time, setTime] = useState(() => tokyoNowTime());
  const [dayId, setDayId] = useState(
    initialDay?.id ?? dayIdForDate(days, initialDate),
  );
  const [error, setError] = useState("");

  const tripDates = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) set.add(key);
    }
    return set;
  }, [days]);

  const categoryOptions = SPEND_CATEGORIES.map((value) => ({
    value,
    label: labelCategory(locale, value) ?? value,
  }));

  const dayOptions = days.map((day) => ({
    value: day.id,
    label: day.name,
  }));

  function onDayDateChange(next: string) {
    setDayDate(next);
    const matched = dayIdForDate(days, next);
    if (matched) setDayId(matched);
  }

  function onSave() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError(t("quick.amountRequired"));
      amountRef.current?.focus();
      return;
    }
    const categoryLabel = labelCategory(locale, category) ?? category;
    const spendName = name.trim() || categoryLabel;
    const clientId = crypto.randomUUID();
    const formData = new FormData();
    formData.set("name", spendName);
    formData.set("amount", String(parsed));
    formData.set("currency", currency);
    formData.set("kind", "Actual");
    formData.set("category", category);
    formData.set("notes", "");
    formData.set("dayId", dayId);
    formData.set("paidBy", paidBy);
    formData.set("dayDate", dayDate);
    formData.set("time", time);
    formData.set("clientId", clientId);

    try {
      window.localStorage.setItem(CURRENCY_KEY, currency);
      if (paidBy) window.localStorage.setItem(PAYER_KEY, paidBy);
    } catch {
      /* ignore quota */
    }

    startTransition(async () => {
      const result = await submitSpend(formData, { silent: true });
      if (!result.ok) {
        setError(result.error);
        haptic("error");
        toast(result.error, "error");
        return;
      }

      haptic("success");
      onClose();

      const undoQueued = async () => {
        const entries = await listOutbox();
        const entry = entries.find(
          (row) =>
            row.kind === "addSpend" &&
            (row.payload as { clientId?: string }).clientId === clientId,
        );
        if (entry) {
          await deleteOutboxEntry(entry.id);
          await refresh();
          toast(t("quick.undone"));
        }
      };

      const undoSynced = async (id: string) => {
        const fd = new FormData();
        fd.set("id", id);
        const del = await deleteSpend(fd);
        if (del.ok) {
          toast(t("quick.undone"));
        } else {
          toast(del.error, "error");
        }
      };

      if (result.id) {
        toast(result.message ?? t("quick.saved"), {
          actionLabel: t("common.undo"),
          onAction: () => {
            void undoSynced(result.id!);
          },
        });
      } else {
        toast(t("offline.savedQueued"), {
          actionLabel: t("common.undo"),
          onAction: () => {
            void undoQueued();
          },
        });
      }
    });
  }

  const selectedDay = days.find((d) => d.id === dayId);

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-[4.75rem]">
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-muted">{t("form.amount")}</span>
        <div className="flex items-end gap-3">
          <input
            ref={amountRef}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0"
            aria-label={t("form.amount")}
            className="min-w-0 flex-1 border-0 bg-transparent text-[40px] font-semibold leading-none text-ink outline-none tabular-nums placeholder:text-ink-muted/40"
          />
          <div
            className="flex shrink-0 gap-2"
            role="radiogroup"
            aria-label={t("form.currency")}
          >
            {(["Yen", "RM"] as const).map((option) => {
              const selected = currency === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCurrency(option)}
                  className={`notebook-btn inline-flex min-h-11 min-w-11 items-center justify-center px-3.5 text-sm font-medium ${
                    selected
                      ? "bg-accent text-white"
                      : "border border-line bg-surface text-ink"
                  }`}
                >
                  {option === "Yen" ? "¥" : "RM"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ChipGroup
        label={t("form.category")}
        value={category}
        onChange={setCategory}
        options={categoryOptions}
      />

      {people.length > 0 ? (
        <ChipGroup
          label={t("form.paidBy")}
          value={paidBy || people[0]}
          onChange={setPaidBy}
          options={people.map((person) => ({
            value: person,
            label: person,
          }))}
        />
      ) : (
        <label className="grid gap-1">
          <span className="text-xs font-medium text-ink-muted">
            {t("form.paidBy")}
          </span>
          <input
            value={paidBy}
            onChange={(event) => setPaidBy(event.target.value)}
            className={fieldClass}
          />
        </label>
      )}

      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">
          {t("form.name")}
          <span className="font-normal text-ink-muted/80">
            {" "}
            ({t("quick.nameOptional")})
          </span>
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={labelCategory(locale, category) ?? category}
          className={fieldClass}
        />
      </label>

      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-muted">{t("form.date")}</span>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            name="dayDate"
            value={dayDate}
            onChange={onDayDateChange}
            tripDates={tripDates}
            label={null}
            compact
          />
          <label className="notebook-btn inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-sm font-medium text-ink">
            <span className="sr-only">{t("budget.timeOptional")}</span>
            <input
              type="time"
              step={60}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="border-0 bg-transparent text-sm tabular-nums outline-none"
            />
          </label>
          {selectedDay ? (
            <span className="text-xs text-ink-muted">{selectedDay.name}</span>
          ) : (
            <span className="text-xs text-ink-muted">
              {formatDay(dayDate, locale)}
            </span>
          )}
        </div>
      </div>

      {dayOptions.length > 0 ? (
        <ChipGroup
          label={t("form.day")}
          value={dayId || dayOptions[0].value}
          onChange={setDayId}
          options={dayOptions}
        />
      ) : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-line bg-canvas px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          disabled={pending}
          data-haptic="manual"
          onClick={onSave}
          className={`${btnPrimaryClass} w-full py-3`}
        >
          {pending ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </div>
  );
}
