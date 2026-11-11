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
import { categoryBreakdown, settleUp, topSpend, toRm } from "@/lib/spend";
import { SPEND_CATEGORIES, type Place, type SpendItem, type TripDay } from "@/lib/types";

type Tab = "timeline" | "category" | "top" | "split";
type DisplayCurrency = "MYR" | "YEN";
type CategoryFilter = "all" | (typeof SPEND_CATEGORIES)[number];

const TAB_IDS: Tab[] = ["timeline", "category", "top", "split"];
const TAB_KEY: Record<Tab, string> = {
  timeline: "budget.tabTimeline",
  category: "budget.tabCategory",
  top: "budget.tabTop",
  split: "budget.tabSplit",
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
  people = [],
  places = [],
}: {
  actuals: SpendItem[];
  days: TripDay[];
  people?: string[];
  places?: Place[];
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
  const settle = useMemo(
    () => settleUp(mergedActuals, people, jpyPerRm),
    [mergedActuals, people, jpyPerRm],
  );
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
        <p className="truncate text-right text-[13px] leading-5 text-ink">
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
        <p className="mt-1 truncate text-right text-[11px] text-ink-muted" title={fxTitle}>
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
              places={places}
            />
          </div>
        </>
      ) : null}

      {tab === "category" ? (
        <CategorySummary
          rows={categories}
          items={mergedActuals}
          totalRm={spentRm}
          displayYen={yen}
          jpyPerRm={jpyPerRm}
          locale={locale}
          totalLabel={t("budget.total")}
          places={places}
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
                  places={places}
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

      {tab === "split" ? (
        <SettlePanel
          settle={settle}
          displayYen={yen}
          jpyPerRm={jpyPerRm}
          fxTitle={fxTitle}
          places={places}
        />
      ) : null}
    </>
  );
}

function SettlePanel({
  settle,
  displayYen,
  jpyPerRm,
  fxTitle,
  places = [],
}: {
  settle: ReturnType<typeof settleUp>;
  displayYen: boolean;
  jpyPerRm: number;
  fxTitle: string;
  places?: Place[];
}) {
  const { t } = useT();
  const money = (rm: number) => formatAmount(rm, displayYen, jpyPerRm);
  const anyPaid = settle.balances.some((row) => row.paidRm > 0);

  if (!anyPaid && settle.unassigned.length === 0) {
    return (
      <EmptyState title={t("budget.empty")}>{t("settle.empty")}</EmptyState>
    );
  }

  return (
    <div className="grid gap-3 md:max-w-xl">
      <section>
        <h2 className="text-[13px] font-semibold text-ink">
          {settle.transfers.length > 0
            ? t("settle.transfersTitle", { n: settle.transfers.length })
            : t("settle.allSettled")}
        </h2>
        {settle.transfers.length > 0 ? (
          <ul className="mt-1 divide-y divide-line/80">
            {settle.transfers.map((transfer) => (
              <li
                key={`${transfer.from}->${transfer.to}`}
                className="flex min-h-11 items-center gap-2 text-[13px]"
                aria-label={t("settle.transferAria", {
                  from: transfer.from,
                  to: transfer.to,
                  amount: money(transfer.rm),
                })}
              >
                <span aria-hidden className="min-w-0 truncate font-medium">
                  {transfer.from}
                </span>
                <span aria-hidden className="text-ink-muted">→</span>
                <span aria-hidden className="min-w-0 flex-1 truncate font-medium">
                  {transfer.to}
                </span>
                <span aria-hidden className="shrink-0 font-semibold tabular-nums">
                  {money(transfer.rm)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <table className="w-full text-[13px]">
          <caption className="pb-1 text-left text-[13px] font-semibold text-ink">
            {t("settle.balancesTitle")}
          </caption>
          <thead>
            <tr className="text-[11px] text-ink-muted">
              <th scope="col" className="py-1 text-left font-medium" />
              <th scope="col" className="py-1 text-right font-medium">{t("settle.paid")}</th>
              <th scope="col" className="py-1 text-right font-medium">{t("settle.share")}</th>
              <th scope="col" className="py-1 text-right font-medium">{t("settle.net")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80">
            {settle.balances.map((row) => {
              const cents = Math.round(row.netRm * 100);
              return (
                <tr key={row.name}>
                  <th scope="row" className="truncate py-1.5 text-left font-medium">
                    {row.name}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">{money(row.paidRm)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(row.shareRm)}</td>
                  <td
                    className={`py-1.5 text-right font-medium tabular-nums ${
                      cents > 0 ? "text-ok" : cents < 0 ? "text-accent" : "text-ink-muted"
                    }`}
                  >
                    {cents > 0 ? "+" : cents < 0 ? "−" : ""}
                    {money(Math.abs(row.netRm))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {settle.unassigned.length > 0 ? (
        <details className="rounded-lg border border-line bg-surface px-3 py-2">
          <summary className="flex min-h-8 cursor-pointer items-center text-[13px] font-medium text-maybe">
            ⚠ {t("settle.unassigned", { n: settle.unassigned.length })}
          </summary>
          <div className="mt-1 grid">
            {settle.unassigned.map((item) => (
              <SpendItemCard
                key={item.id}
                item={item}
                jpyPerRm={jpyPerRm}
                displayYen={displayYen}
                compact
                places={places}
              />
            ))}
          </div>
        </details>
      ) : null}

      <p className="text-[11px] text-ink-muted">
        {fxTitle} · {t("settle.fxNote")}
      </p>
    </div>
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

function itemsForCategory(
  items: SpendItem[],
  category: (typeof SPEND_CATEGORIES)[number],
) {
  return items.filter((item) => {
    const key = SPEND_CATEGORIES.includes(
      item.category as (typeof SPEND_CATEGORIES)[number],
    )
      ? (item.category as (typeof SPEND_CATEGORIES)[number])
      : "Other";
    return key === category;
  });
}

function CategorySummary({
  rows,
  items,
  totalRm,
  displayYen,
  jpyPerRm,
  locale,
  totalLabel,
  places = [],
}: {
  rows: ReturnType<typeof categoryBreakdown>;
  items: SpendItem[];
  totalRm: number;
  displayYen: boolean;
  jpyPerRm: number;
  locale: ReturnType<typeof useT>["locale"];
  totalLabel: string;
  places?: Place[];
}) {
  const { t } = useT();
  const largest = useMemo(() => {
    let best: (typeof SPEND_CATEGORIES)[number] | null = null;
    let bestAmt = 0;
    for (const row of rows) {
      if (row.amountRm > bestAmt) {
        bestAmt = row.amountRm;
        best = row.category;
      }
    }
    return bestAmt > 0 ? best : null;
  }, [rows]);
  const [openCategory, setOpenCategory] = useState<
    (typeof SPEND_CATEGORIES)[number] | null
  >(largest);

  return (
    <ul className="divide-y divide-line/80 md:max-w-xl">
      {rows.map((row) => {
        const label = labelCategory(locale, row.category) ?? row.category;
        const groupItems = itemsForCategory(items, row.category)
          .slice()
          .sort(
            (a, b) =>
              toRm(b.amount, b.currency, jpyPerRm) -
              toRm(a.amount, a.currency, jpyPerRm),
          );
        const canOpen = groupItems.length > 0;
        const open = canOpen && openCategory === row.category;
        return (
          <li key={row.category} className="py-1.5">
            <button
              type="button"
              disabled={!canOpen}
              aria-expanded={canOpen ? open : undefined}
              aria-label={
                canOpen
                  ? open
                    ? t("budget.collapseCategory", { category: label })
                    : t("budget.expandCategory", { category: label })
                  : undefined
              }
              onClick={() => {
                if (!canOpen) return;
                setOpenCategory((prev) =>
                  prev === row.category ? null : row.category,
                );
              }}
              className={`flex w-full flex-col gap-1 text-left ${
                canOpen ? "" : "cursor-default opacity-60"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-1.5">
                  {canOpen ? (
                    <span
                      aria-hidden
                      className="shrink-0 text-[10px] text-ink-muted"
                    >
                      {open ? "▾" : "▸"}
                    </span>
                  ) : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(row.category) }}
                      aria-hidden
                    />
                  )}
                  {canOpen ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(row.category) }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate font-medium">{label}</span>
                  <span className="text-[11px] text-ink-muted tabular-nums">
                    {row.percent}%
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatAmount(row.amountRm, displayYen, jpyPerRm)}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${row.percent}%`,
                    backgroundColor: categoryColor(row.category),
                  }}
                />
              </div>
            </button>
            {open ? (
              <ul className="mt-1 divide-y divide-line/70">
                {groupItems.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <SpendItemCard
                      item={item}
                      jpyPerRm={jpyPerRm}
                      displayYen={displayYen}
                      compact
                      places={places}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
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
