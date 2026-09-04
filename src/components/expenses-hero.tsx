"use client";

import { useState } from "react";
import { yenForMyr } from "@/lib/exchange";
import { formatRm, formatYen } from "@/lib/format";
import { eyebrowClass } from "@/components/page-shell";

type DisplayCurrency = "MYR" | "YEN";

export function ExpensesHero({
  spentRm,
  jpyPerRm,
  tenMyrInYen,
  fxLive,
  fxAsOf,
  categories,
}: {
  spentRm: number;
  jpyPerRm: number;
  tenMyrInYen: number;
  fxLive: boolean;
  fxAsOf: string | null;
  categories: [string, number][];
}) {
  const [display, setDisplay] = useState<DisplayCurrency>("MYR");
  const yen = display === "YEN";

  return (
    <>
      <div>
        <p className={eyebrowClass}>Trip spend</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
          <button
            type="button"
            aria-pressed={yen}
            aria-label={yen ? "Showing yen. Switch to MYR" : "Showing MYR. Switch to yen"}
            onClick={() => setDisplay(yen ? "MYR" : "YEN")}
            className="rounded-full bg-hanko px-3 py-0.5 text-xs font-semibold tracking-wide text-white"
          >
            {display}
          </button>
        </div>
      </div>

      <div className="notebook-card p-4 md:max-w-xl">
        <p className="text-xs uppercase tracking-wide text-stone-500">Spent</p>
        <p className="mt-1 text-2xl font-medium">
          {yen ? formatYen(yenForMyr(spentRm, jpyPerRm)) : formatRm(spentRm)}
        </p>
        <p className="mt-3 text-sm font-medium text-stone-800">
          10 MYR ~ {formatYen(tenMyrInYen)}
        </p>
        <p className="mt-0.5 text-xs text-stone-500">
          {fxLive
            ? `1 MYR = ${jpyPerRm.toFixed(2)} JPY${fxAsOf ? ` · ${fxAsOf}` : ""}`
            : "Live rate unavailable · using fallback"}
        </p>
      </div>

      {categories.length > 0 ? (
        <ul className="max-w-xl space-y-1 text-sm text-stone-600">
          {categories.map(([category, amount]) => (
            <li key={category} className="flex justify-between gap-3">
              <span>{category}</span>
              <span>
                {yen ? formatYen(yenForMyr(amount, jpyPerRm)) : formatRm(amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
