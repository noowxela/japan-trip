"use client";

import { useState } from "react";
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
  const [currency, setCurrency] = useState<SpendCurrency>(defaultCurrency);

  return (
    <div className="flex overflow-hidden rounded-xl border border-stone-200 focus-within:border-[#b42318]">
      <input
        name="amount"
        type="number"
        required
        min="0"
        step={currency === "Yen" ? "1" : "0.01"}
        inputMode="decimal"
        defaultValue={defaultAmount ?? undefined}
        placeholder={currency === "Yen" ? "Amount (Yen)" : "Amount (RM)"}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
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
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selected
                  ? "bg-[#b42318] text-white"
                  : "bg-stone-100 text-stone-600"
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
