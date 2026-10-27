"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  DEFAULT_SPEND_CURRENCY,
  SPEND_CURRENCIES,
  type SpendCurrency,
} from "@/lib/types";

export function SpendAmountField({
  defaultCurrency = DEFAULT_SPEND_CURRENCY,
  defaultAmount,
}: {
  defaultCurrency?: SpendCurrency;
  defaultAmount?: number;
} = {}) {
  const { t } = useT();
  const [currency, setCurrency] = useState<SpendCurrency>(defaultCurrency);

  return (
    <div className="flex overflow-hidden rounded-xl border border-line focus-within:border-accent">
      <input
        name="amount"
        type="number"
        required
        min="0"
        step={currency === "Yen" ? "1" : "0.01"}
        inputMode="decimal"
        defaultValue={defaultAmount ?? undefined}
        placeholder={currency === "Yen" ? t("form.amountYen") : t("form.amountRm")}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none"
      />
      <input type="hidden" name="currency" value={currency} />
      <div className="flex items-center gap-1 p-1">
        {SPEND_CURRENCIES.map((option) => {
          const selected = currency === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => setCurrency(option)}
              className={`notebook-btn px-3 py-1 text-xs font-medium ${
                selected
                  ? "bg-accent text-white"
                  : "bg-canvas text-ink-muted"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
