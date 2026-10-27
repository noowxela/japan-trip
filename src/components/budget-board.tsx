"use client";

import { useMemo, useState } from "react";
import { EditorLockButton } from "@/components/editor-lock-button";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { categoryColor } from "@/components/spend-category-icon";
import { SpendItemCard } from "@/components/spend-item-card";
import { SpendTimeline, formatAmount } from "@/components/spend-timeline";
import { labelCategory } from "@/lib/i18n/dictionaries";
import { categoryBreakdown, topSpend } from "@/lib/spend";
import { SPEND_CATEGORIES, type SpendItem, type TripDay } from "@/lib/types";

type Tab = "timeline" | "category" | "top";
type DisplayCurrency = "MYR" | "YEN";
type CategoryFilter = "all" | (typeof SPEND_CATEGORIES)[number];

const TAB_IDS: Tab[] = ["timeline", "category", "top"];
const TAB_KEY: Record<Tab, string> = {
  timeline: "budget.tabTimeline",
  category: "budget.tabCategory",
  top: "budget.tabTop",
};

export function BudgetBoard({
  actuals,
  days,
  spentRm,
  estimateRm,
  jpyPerRm,
  tenMyrInYen: _tenMyrInYen,
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
  void _tenMyrInYen;
  const { t, locale } = useT();
  const { pendingSpend } = useOutbox();
  const [tab, setTab] = useState<Tab>("timeline");
  const [display, setDisplay] = useState<DisplayCurrency>("MYR");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const yen = display === "YEN";
  const mergedActuals = useMemo(() => {
    const pending = pendingSpend.filter(
      (item) => !item.kind || item.kind === "Actual",
    );
    return [...pending, ...actuals];
  }, [actuals, pendingSpend]);
  const filteredActuals = useMemo(() => {
    if (categoryFilter === "all") return mergedActuals;
    return mergedActuals.filter((item) => item.category === categoryFilter);
  }, [categoryFilter, mergedActuals]);
  const usedPct =
    estimateRm > 0 ? Math.round((spentRm / estimateRm) * 100) : null;
  const remainingRm = estimateRm - spentRm;
  const over = usedPct != null && spentRm > estimateRm;
  const categories = categoryBreakdown(mergedActuals, jpyPerRm);
  const topItems = topSpend(mergedActuals, 10, jpyPerRm);
  const yen100InRm = jpyPerRm > 0 ? 100 / jpyPerRm : 0;
  const fxTitle = fxLive
    ? fxAsOf
      ? t("budget.fxAsOf", { rate: jpyPerRm.toFixed(2), asOf: fxAsOf })
      : t("budget.fxLine", { rate: jpyPerRm.toFixed(2) })
    : t("budget.fxFallback");
  const barPct =
    usedPct == null ? 0 : Math.min(100, Math.max(0, usedPct));
  const barColor = over
    ? "var(--accent)"
    : usedPct != null && usedPct >= 90
      ? "var(--maybe)"
      : "var(--ok)";

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t("budget.title")}</h1>
        <button
          type="button"
          aria-pressed={yen}
          aria-label={yen ? t("budget.showYen") : t("budget.showMyr")}
          onClick={() => setDisplay(yen ? "MYR" : "YEN")}
          className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-surface"
        >
          {display}
        </button>
        <div className="ml-auto">
          <EditorLockButton />
        </div>
      </div>

      <section className="max-h-[90px] rounded-xl border border-line bg-surface px-3 py-2 md:max-w-xl">
        <p className="truncate text-[13px] leading-5 text-ink">
          <span className="font-medium">
            {t("budget.spentShort", {
              amount: formatAmount(spentRm, yen, jpyPerRm),
            })}
          </span>
          {usedPct != null ? (
            <>
              <span className="text-ink-muted"> · </span>
              <span>
                {t("budget.budgetShort", {
                  amount: formatAmount(estimateRm, yen, jpyPerRm),
                })}
              </span>
              <span className="text-ink-muted"> · </span>
              <span className={over ? "font-medium text-accent" : "font-medium text-ok"}>
                {over
                  ? t("budget.overBy", {
                      amount: formatAmount(Math.abs(remainingRm), yen, jpyPerRm),
                    })
                  : t("budget.remaining", {
                      amount: formatAmount(remainingRm, yen, jpyPerRm),
                    })}
              </span>
            </>
          ) : null}
        </p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${barPct}%`, backgroundColor: barColor }}
            aria-hidden
          />
        </div>
        <p className="mt-1 truncate text-[11px] text-ink-muted" title={fxTitle}>
          {t("budget.fxCompact", { rm: yen100InRm.toFixed(2) })}
        </p>
      </section>

      <div className="flex h-8 rounded-lg bg-canvas p-0.5 md:max-w-xl">
        {TAB_IDS.map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(id)}
              className={`min-w-0 flex-1 rounded-md px-2 text-xs font-medium transition-colors ${
                active ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              {t(TAB_KEY[id])}
            </button>
          );
        })}
      </div>

      {tab === "timeline" ? (
        <>
          <div className="chip-scroll-fade md:max-w-xl">
            <div
              role="toolbar"
              aria-label={t("budget.categoryFilter")}
              className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
            >
              <CategoryChip
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
                label={t("budget.filterAll")}
              />
              {SPEND_CATEGORIES.map((category) => (
                <CategoryChip
                  key={category}
                  active={categoryFilter === category}
                  onClick={() => setCategoryFilter(category)}
                  label={labelCategory(locale, category) ?? category}
                  color={categoryColor(category)}
                />
              ))}
            </div>
          </div>
          <div className="mt-2 md:max-w-xl">
            <SpendTimeline
              items={filteredActuals}
              days={days}
              jpyPerRm={jpyPerRm}
              displayYen={yen}
            />
          </div>
        </>
      ) : null}

      {tab === "category" ? (
        <CategorySummary
          rows={categories}
          totalRm={spentRm}
          displayYen={yen}
          jpyPerRm={jpyPerRm}
          locale={locale}
          totalLabel={t("budget.total")}
        />
      ) : null}

      {tab === "top" ? (
        topItems.length > 0 ? (
          <ol className="grid gap-0 divide-y divide-line/80 md:max-w-xl">
            {topItems.map((item, index) => (
              <li key={item.id} className="grid grid-cols-[1.25rem_1fr] items-center gap-1.5 py-0.5">
                <span className="text-center text-[11px] font-medium text-ink-muted tabular-nums">
                  {index + 1}
                </span>
                <SpendItemCard
                  item={item}
                  jpyPerRm={jpyPerRm}
                  displayYen={yen}
                  compact
                />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title={t("budget.empty")}>
            {t("budget.timelineEmpty")}
          </EmptyState>
        )
      ) : null}
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
        active
          ? "bg-ink text-surface"
          : "bg-surface text-ink-muted ring-1 ring-line"
      }`}
    >
      {color ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: active ? "currentColor" : color }}
          aria-hidden
        />
      ) : null}
      {label}
    </button>
  );
}

function CategorySummary({
  rows,
  totalRm,
  displayYen,
  jpyPerRm,
  locale,
  totalLabel,
}: {
  rows: ReturnType<typeof categoryBreakdown>;
  totalRm: number;
  displayYen: boolean;
  jpyPerRm: number;
  locale: ReturnType<typeof useT>["locale"];
  totalLabel: string;
}) {
  return (
    <ul className="divide-y divide-line/80 md:max-w-xl">
      {rows.map((row) => (
        <li key={row.category} className="py-1.5">
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: categoryColor(row.category) }}
              />
              <span className="truncate font-medium">
                {labelCategory(locale, row.category)}
              </span>
              <span className="text-[11px] text-ink-muted tabular-nums">
                {row.percent}%
              </span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatAmount(row.amountRm, displayYen, jpyPerRm)}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-canvas">
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
      <li className="py-1.5">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-ink" />
            <span className="font-medium">{totalLabel}</span>
            <span className="text-[11px] text-ink-muted tabular-nums">100%</span>
          </span>
          <span className="font-medium tabular-nums">
            {formatAmount(totalRm, displayYen, jpyPerRm)}
          </span>
        </div>
      </li>
    </ul>
  );
}
