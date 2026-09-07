"use client";

import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { eyebrowClass } from "@/components/page-shell";
import { categoryColor } from "@/components/spend-category-icon";
import { SpendItemCard } from "@/components/spend-item-card";
import { SpendTimeline, formatAmount } from "@/components/spend-timeline";
import { formatYen } from "@/lib/format";
import { categoryBreakdown, topSpend } from "@/lib/spend";
import type { SpendItem, TripDay } from "@/lib/types";

type Tab = "timeline" | "category" | "top";
type DisplayCurrency = "MYR" | "YEN";

const TABS: { id: Tab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "category", label: "Category" },
  { id: "top", label: "TOP 10" },
];

export function BudgetBoard({
  actuals,
  days,
  spentRm,
  estimateRm,
  jpyPerRm,
  tenMyrInYen,
  fxLive,
  fxAsOf,
}: {
  actuals: SpendItem[];
  days: TripDay[];
  spentRm: number;
  estimateRm: number;
  jpyPerRm: number;
  tenMyrInYen: number;
  fxLive: boolean;
  fxAsOf: string | null;
}) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [display, setDisplay] = useState<DisplayCurrency>("MYR");
  const yen = display === "YEN";
  const usedPct =
    estimateRm > 0 ? Math.min(100, Math.round((spentRm / estimateRm) * 100)) : null;
  const categories = categoryBreakdown(actuals, jpyPerRm);
  const topItems = topSpend(actuals, 10, jpyPerRm);

  return (
    <>
      <div>
        <p className={eyebrowClass}>Trip spend</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
          <button
            type="button"
            aria-pressed={yen}
            aria-label={
              yen ? "Showing yen. Switch to MYR" : "Showing MYR. Switch to yen"
            }
            onClick={() => setDisplay(yen ? "MYR" : "YEN")}
            className="rounded-full bg-hanko px-3 py-0.5 text-xs font-semibold tracking-wide text-white"
          >
            {display}
          </button>
        </div>
      </div>

      <section className="flex items-end gap-4 md:max-w-xl">
        <BudgetGauge
          pct={usedPct}
          spentLabel={formatAmount(spentRm, yen, jpyPerRm)}
        />
        <div className="min-w-0 pb-2">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Spent
          </p>
          <p className="mt-1 text-2xl font-medium">
            {formatAmount(spentRm, yen, jpyPerRm)}
          </p>
          {usedPct != null ? (
            <p className="mt-1 text-sm text-stone-500">
              {formatAmount(estimateRm, yen, jpyPerRm)} budget
            </p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-stone-800">
            10 MYR ~ {formatYen(tenMyrInYen)}
          </p>
          <p className="mt-0.5 text-xs text-stone-500">
            {fxLive
              ? `1 MYR = ${jpyPerRm.toFixed(2)} JPY${fxAsOf ? ` · ${fxAsOf}` : ""}`
              : "Live rate unavailable · using fallback"}
          </p>
        </div>
      </section>

      <div className="flex rounded-full bg-sage/80 p-1 md:max-w-xl">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(entry.id)}
              className={`min-w-0 flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "timeline" ? (
        <SpendTimeline
          items={actuals}
          days={days}
          jpyPerRm={jpyPerRm}
          displayYen={yen}
        />
      ) : null}

      {tab === "category" ? (
        <CategorySummary
          rows={categories}
          totalRm={spentRm}
          displayYen={yen}
          jpyPerRm={jpyPerRm}
        />
      ) : null}

      {tab === "top" ? (
        topItems.length > 0 ? (
          <ol className="grid gap-2">
            {topItems.map((item, index) => (
              <li key={item.id} className="grid grid-cols-[1.5rem_1fr] items-start gap-2">
                <span className="pt-4 text-center text-xs font-medium text-stone-400">
                  {index + 1}
                </span>
                <SpendItemCard
                  item={item}
                  jpyPerRm={jpyPerRm}
                  displayYen={yen}
                />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="No expenses yet">
            Expenses appear here once someone logs a spend.
          </EmptyState>
        )
      ) : null}
    </>
  );
}

function BudgetGauge({
  pct,
  spentLabel,
}: {
  pct: number | null;
  spentLabel: string;
}) {
  const fill = pct ?? 0;
  return (
    <div
      className="relative h-36 w-36 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-sage"
      aria-label={
        pct != null ? `${pct}% of budget used` : `Spent ${spentLabel}`
      }
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-[#9ec5c3]"
        style={{ height: `${fill}%` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {pct != null ? (
          <>
            <span className="text-3xl font-semibold leading-none">{pct}%</span>
            <span className="mt-1 text-[11px] uppercase tracking-wide text-stone-500">
              Budget used
            </span>
          </>
        ) : (
          <>
            <span className="text-lg font-semibold leading-tight">{spentLabel}</span>
            <span className="mt-1 text-[11px] uppercase tracking-wide text-stone-500">
              Spent
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function CategorySummary({
  rows,
  totalRm,
  displayYen,
  jpyPerRm,
}: {
  rows: ReturnType<typeof categoryBreakdown>;
  totalRm: number;
  displayYen: boolean;
  jpyPerRm: number;
}) {
  return (
    <ul className="notebook-card divide-y divide-stone-100 p-4 md:max-w-xl">
      {rows.map((row) => (
        <li key={row.category} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor(row.category) }}
              />
              <span className="font-medium">{row.category}</span>
              <span className="text-stone-400">{row.percent}%</span>
            </span>
            <span className="shrink-0 font-medium">
              {formatAmount(row.amountRm, displayYen, jpyPerRm)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage/80">
            <div
              className="h-full rounded-full"
              style={{
                width: `${row.percent}%`,
                backgroundColor: categoryColor(row.category),
              }}
            />
          </div>
        </li>
      ))}
      <li className="py-3 last:pb-0">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0f766e]" />
            <span className="font-medium">Total</span>
            <span className="text-stone-400">100%</span>
          </span>
          <span className="font-medium">
            {formatAmount(totalRm, displayYen, jpyPerRm)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage/80">
          <div className="h-full w-full rounded-full bg-[#0f766e]" />
        </div>
      </li>
    </ul>
  );
}
